import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Sparkles, Send, Mail, MailX } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email: string;
  channel_name: string | null;
  platform: string | null;
  youtube_url: string | null;
  niche: string | null;
  last_posted: string | null;
  ability_to_pay_analysis: string | null;
  status: string;
  created_at: string;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [youtubeUrls, setYoutubeUrls] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isMoveToCampaignOpen, setIsMoveToCampaignOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  useEffect(() => {
    fetchLeads();
    fetchCampaigns();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error("Failed to load campaigns:", error);
    }
  };

  const handleAnalyzeChannels = async () => {
    if (!youtubeUrls.trim()) {
      toast.error("Please paste YouTube channel URLs");
      return;
    }

    setAnalyzing(true);
    try {
      const urls = youtubeUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const { data, error } = await supabase.functions.invoke('analyze-youtube-channels', {
        body: { urls }
      });

      if (error) throw error;

      if (data.leads && data.leads.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in to save leads");
          return;
        }

        const leadsToInsert = data.leads.map((lead: any) => {
          let lastPosted = null;
          if (lead.last_posted && lead.last_posted !== 'Unknown' && lead.last_posted !== 'recent estimate' &&
            lead.last_posted !== 'N/A') {
            try {
              const date = new Date(lead.last_posted);
              if (!isNaN(date.getTime())) {
                lastPosted = date.toISOString();
              }
            } catch (e) {
              console.log('Could not parse date:', lead.last_posted);
            }
          }

          return {
            user_id: user.id,
            name: lead.name,
            email: lead.email,
            channel_name: lead.channel_name,
            platform: lead.platform,
            youtube_url: lead.youtube_url,
            niche: lead.niche,
            last_posted: lastPosted,
            ability_to_pay_analysis: lead.ability_to_pay_analysis,
            status: 'new'
          };
        });

        const { error: insertError } = await supabase
          .from("leads")
          .insert(leadsToInsert);

        if (insertError) throw insertError;

        toast.success(`Successfully analyzed and added ${data.leads.length} leads!`);
        setYoutubeUrls("");
        fetchLeads();
      } else {
        toast.error("No leads found in analysis");
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || "Failed to analyze channels");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;

      toast.success("Lead deleted successfully");
      setSelectedLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      fetchLeads();
    } catch (error: any) {
      toast.error("Failed to delete lead");
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    }
  };

  const handleMoveToCampaign = async () => {
    if (!selectedCampaignId) {
      toast.error("Please select a campaign");
      return;
    }

    if (selectedLeads.size === 0) {
      toast.error("Please select at least one lead");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const campaignLeadsData = Array.from(selectedLeads).map(leadId => ({
        campaign_id: selectedCampaignId,
        lead_id: leadId,
        user_id: user.id
      }));

      const { error } = await supabase
        .from("campaign_leads")
        .insert(campaignLeadsData);

      if (error) throw error;

      // Update campaign total_leads count
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ total_leads: selectedLeads.size })
        .eq("id", selectedCampaignId);

      toast.success(`${selectedLeads.size} lead(s) added to campaign`);
      setSelectedLeads(new Set());
      setIsMoveToCampaignOpen(false);
      setSelectedCampaignId("");
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error("Some leads are already in this campaign");
      } else {
        toast.error("Failed to add leads to campaign");
      }
      console.error(error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const leadsWithEmail = leads.filter(lead => 
    lead.email && lead.email !== 'No email found' && lead.email.includes('@')
  );
  const leadsWithoutEmail = leads.filter(lead => 
    !lead.email || lead.email === 'No email found' || !lead.email.includes('@')
  );

  const renderLeadsList = (leadsToRender: Lead[]) => (
    <>
      {leadsToRender.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Checkbox
            checked={selectedLeads.size === leadsToRender.length && leadsToRender.length > 0}
            onCheckedChange={() => {
              if (selectedLeads.size === leadsToRender.length) {
                setSelectedLeads(new Set());
              } else {
                setSelectedLeads(new Set(leadsToRender.map(lead => lead.id)));
              }
            }}
          />
          <span className="text-sm text-muted-foreground">
            Select All ({selectedLeads.size} selected)
          </span>
        </div>
      )}
      <div className="space-y-4">
        {leadsToRender.map((lead) => (
          <Card key={lead.id}>
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <Checkbox
                  checked={selectedLeads.has(lead.id)}
                  onCheckedChange={() => toggleLeadSelection(lead.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle>{lead.name}</CardTitle>
                    <Badge variant="outline">{lead.status}</Badge>
                    {lead.platform && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {lead.platform}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(lead.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="text-foreground">{lead.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Channel:</span>{" "}
                    <span className="text-foreground">{lead.channel_name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Niche:</span>{" "}
                    <span className="text-foreground">{lead.niche || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Posted:</span>{" "}
                    <span className="text-foreground">{formatDate(lead.last_posted)}</span>
                  </div>
                </div>

                {lead.ability_to_pay_analysis && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Payment Ability Analysis:</p>
                    <p className="text-sm whitespace-pre-line">{lead.ability_to_pay_analysis}</p>
                  </div>
                )}

                {lead.youtube_url && (
                  <a
                    href={lead.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-block"
                  >
                    View Channel →
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Lead Analyzer</h1>
        {selectedLeads.size > 0 && (
          <Dialog open={isMoveToCampaignOpen} onOpenChange={setIsMoveToCampaignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Send className="h-4 w-4" />
                Move {selectedLeads.size} to Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move Leads to Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleMoveToCampaign} className="w-full">
                  Add to Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Paste YouTube Channel URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-urls">
              Paste anything - URLs, channel names, whole pages with creator info
            </Label>
            <Textarea
              id="youtube-urls"
              placeholder="Paste anything with YouTube channels:&#10;&#10;- Channel URLs: youtube.com/@channelname&#10;- Channel names: @MrBeast, @MKBHD&#10;- Whole pages with multiple channels&#10;- Lists of creators&#10;&#10;AI will find and analyze all channels automatically!"
              value={youtubeUrls}
              onChange={(e) => setYoutubeUrls(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <Button 
            onClick={handleAnalyzeChannels} 
            disabled={analyzing || !youtubeUrls.trim()}
            className="w-full"
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Channels with AI
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            AI will automatically extract channels from any text and analyze: Name, Email, Niche, Last Posted, Payment Ability
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No leads yet. Analyze some YouTube channels to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="with-email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="with-email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Found ({leadsWithEmail.length})
            </TabsTrigger>
            <TabsTrigger value="no-email" className="gap-2">
              <MailX className="h-4 w-4" />
              No Email ({leadsWithoutEmail.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="with-email" className="mt-6">
            {leadsWithEmail.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No leads with email addresses found</p>
                </CardContent>
              </Card>
            ) : (
              renderLeadsList(leadsWithEmail)
            )}
          </TabsContent>
          
          <TabsContent value="no-email" className="mt-6">
            {leadsWithoutEmail.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">All leads have email addresses!</p>
                </CardContent>
              </Card>
            ) : (
              renderLeadsList(leadsWithoutEmail)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

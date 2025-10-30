import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzedLead {
  name: string;
  email: string;
  channel_name: string;
  platform: string;
  youtube_url: string;
  niche: string;
  last_posted: string;
  ability_to_pay_analysis: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();
    console.log('Analyzing YouTube channels:', urls);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY environment variable not found');
      throw new Error('LOVABLE_API_KEY not configured');
    }
    console.log('LOVABLE_API_KEY found, proceeding with analysis');

    const systemPrompt = `You are an advanced YouTube channel analyzer for a video editing outreach service.

CRITICAL REQUIREMENTS:
- You MUST actually visit and browse each YouTube channel URL
- Extract REAL, ACCURATE data from the actual channel pages
- Do NOT make up or estimate any information
- Spend time analyzing the channel thoroughly

YOUR DETAILED ANALYSIS PROCESS:

1. VISIT THE CHANNEL PAGE:
   - Go to the provided YouTube channel URL
   - Navigate to different sections: Home, Videos, About
   
2. EXTRACT CONTACT INFORMATION (Priority #1):
   - Check the "About" tab for email addresses in:
     * "Business inquiries" section
     * Channel description
     * "View email address" button
   - Look for email in video descriptions of recent videos
   - Check channel banner and profile description
   - Record the ACTUAL email or mark as "No email found" if truly absent
   
3. ANALYZE POSTING ACTIVITY:
   - Go to the "Videos" tab
   - Look at the most recent video's upload date
   - Record the EXACT date in YYYY-MM-DD format
   - Check upload frequency: daily, weekly, monthly, sporadic
   - Note any gaps in posting schedule
   
4. ASSESS CHANNEL METRICS:
   - Subscriber count (exact number)
   - Average views per video (calculate from recent 5-10 videos)
   - View-to-subscriber ratio
   - Engagement rate (likes, comments relative to views)
   
5. EVALUATE PRODUCTION QUALITY:
   - Editing complexity (simple cuts vs advanced effects)
   - Use of motion graphics, color grading
   - Audio quality and mixing
   - Thumbnail design quality
   - Overall professional appearance
   
6. IDENTIFY MONETIZATION SIGNS:
   - Sponsorship mentions in videos
   - Product placements
   - Merchandise links
   - Patreon or membership offers
   - Consistency indicating full-time creator
   
7. DETERMINE CONTENT NICHE:
   - Primary content category
   - Target audience
   - Content style and format

RETURN FORMAT - ONLY raw JSON (no markdown, no code fences):
[
  {
    "name": "Creator's actual name from channel",
    "email": "actual email from About/bio section or 'No email found'",
    "channel_name": "Exact channel name",
    "platform": "YouTube",
    "youtube_url": "provided URL",
    "niche": "Specific content category (Gaming, Tech Reviews, Vlogs, Education, etc.)",
    "last_posted": "YYYY-MM-DD from most recent video",
    "ability_to_pay_analysis": "DETAILED ANALYSIS FORMAT:
📊 Channel Metrics: [X] subscribers, [Y] avg views, [Z]% view-to-sub ratio
📅 Upload Frequency: [daily/weekly/monthly], last posted [date]
🎬 Production Quality: [basic/intermediate/professional] - [specific observations about editing, graphics, etc.]
💰 Monetization Indicators: [list specific signs: sponsors mentioned, merch, memberships, etc.]
📈 Engagement: [strong/moderate/weak] - [specific metrics: comments, likes ratio]
💵 ASSESSMENT: [High/Medium/Low] potential to pay for editing services
REASONING: [2-3 sentences explaining why based on above factors]"
  }
]

ABILITY TO PAY SCORING CRITERIA:

🔴 HIGH POTENTIAL (Score 8-10):
- 100K+ subscribers OR exceptional engagement (>15% view-to-sub ratio)
- Professional editing already visible (can afford editors)
- Clear monetization (sponsors, products, memberships)
- Consistent upload schedule (weekly or more)
- Growing channel with upward trajectory

🟡 MEDIUM POTENTIAL (Score 5-7):
- 10K-100K subscribers with decent engagement (5-15%)
- Improving production quality
- Some monetization signs
- Regular uploads (2-4 times per month)
- Established presence but room to grow

🟢 LOW POTENTIAL (Score 1-4):
- Under 10K subscribers
- Inconsistent uploads or long gaps
- Basic production quality
- No clear monetization
- Low engagement rates

Return empty array [] if URL is invalid or not a YouTube channel.

REMEMBER: Quality over speed. Take time to visit each channel thoroughly and provide accurate, detailed analysis.`;

    const userPrompt = `Extract and analyze all YouTube channels from this text:\n\n${urls.join('\n\n')}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('Raw AI Gateway response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse AI Gateway response as JSON:', e);
      console.error('Response text was:', responseText);
      throw new Error('AI Gateway returned invalid JSON response');
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected AI Gateway response structure:', data);
      throw new Error('AI Gateway response missing expected data structure');
    }

    const aiResponse = data.choices[0].message.content;
    console.log('AI Response:', aiResponse);

    // Extract JSON from the response
    let analyzedLeads: AnalyzedLead[];
    try {
      // Remove markdown code fences if present
      let cleanedResponse = aiResponse.trim();
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
      cleanedResponse = cleanedResponse.trim();

      // Try to extract JSON array
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        analyzedLeads = JSON.parse(jsonMatch[0]);
      } else {
        analyzedLeads = JSON.parse(cleanedResponse);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      console.error('Raw AI response:', aiResponse);
      throw new Error('Failed to parse AI analysis. Please try again.');
    }

    console.log('Analyzed leads:', analyzedLeads);

    return new Response(
      JSON.stringify({ leads: analyzedLeads }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in analyze-youtube-channels:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

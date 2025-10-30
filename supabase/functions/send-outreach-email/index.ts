import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadEmail, leadName, channelName, templateSubject, templateBody } = await req.json();
    console.log('Sending outreach email to:', leadEmail);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!leadEmail || leadEmail === 'No email found' || !emailRegex.test(leadEmail)) {
      console.error('Invalid email address:', leadEmail);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email address provided. Please ensure the lead has a valid email.',
          providedEmail: leadEmail
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const gmailUser = Deno.env.get('GMAIL_USER_EMAIL');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailAppPassword) {
      console.error('Gmail credentials missing:', { hasUser: !!gmailUser, hasPassword: !!gmailAppPassword });
      throw new Error('Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD.');
    }

    console.log('Using Gmail account:', gmailUser);

    // Configure SMTP client for Gmail
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    // Personalize the template
    const personalizedBody = templateBody
      .replace(/\{name\}/g, leadName || 'there')
      .replace(/\{channel_name\}/g, channelName || 'your channel');

    const personalizedSubject = templateSubject
      .replace(/\{name\}/g, leadName || 'there')
      .replace(/\{channel_name\}/g, channelName || 'your channel');

    // Send email
    await client.send({
      from: gmailUser,
      to: leadEmail,
      subject: personalizedSubject,
      content: personalizedBody,
    });

    await client.close();

    console.log('Email sent successfully to:', leadEmail);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email sent successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in send-outreach-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

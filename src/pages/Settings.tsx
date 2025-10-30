import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Key, CheckCircle2, ExternalLink } from "lucide-react";

export default function Settings() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your email credentials for sending outreach campaigns
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Gmail SMTP Configuration
          </CardTitle>
          <CardDescription>
            Your Gmail credentials are securely stored in the backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              <strong>Credentials Configured!</strong> Your Gmail credentials are now securely stored and ready to use for sending outreach emails.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Key className="h-4 w-4" />
              Configured Secrets:
            </h3>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <strong>GMAIL_USER_EMAIL</strong> - Your Gmail address
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <strong>GMAIL_APP_PASSWORD</strong> - Your 16-character app password
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h3 className="font-semibold text-sm">How to Generate a Gmail App Password:</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Enable 2-Factor Authentication on your Google Account</li>
              <li>Go to Google Account → Security → 2-Step Verification</li>
              <li>Scroll down and click "App passwords"</li>
              <li>Select "Mail" and your device</li>
              <li>Copy the 16-character password (remove spaces)</li>
              <li>Use it when updating your credentials</li>
            </ol>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google App Passwords
            </a>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Note:</strong> If you need to update your credentials, contact support or use the backend management interface.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

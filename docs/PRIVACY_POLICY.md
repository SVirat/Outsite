# Privacy Policy

**Last Updated: April 18, 2026**

## Introduction

Superplot ("we", "our", "us") is a private property management application. We are committed to protecting your privacy and being transparent about how we handle your data. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.

## Information We Collect

### Account Information
When you sign in with Google, we receive and store:
- Your name and email address
- Your Google profile picture URL
- A unique user identifier

### Property Data
You may voluntarily provide:
- Property names, addresses, and locations
- Ownership and rental details (rent amounts, tenant contact info)
- Purchase prices and current valuations
- Property sizes and related metadata

### Documents
- Documents you upload are stored directly in **your own Google Drive** account, inside a folder called "PropertyVault"
- We store only the Google Drive file ID and a link to the file — **we do not store your actual documents on our servers**

### Authentication Tokens
- We store OAuth tokens (access and refresh tokens) issued by Google to interact with your Google Drive on your behalf
- These tokens are stored securely in our database and are used solely to manage files in your Google Drive

## How We Use Your Information

We use your information exclusively to:
- Authenticate your identity via Google Sign-In
- Display and manage your property portfolio within the app
- Upload, organize, and retrieve documents from your Google Drive
- Provide search functionality across your properties

We do **not**:
- Sell, rent, or share your personal data with third parties
- Use your data for advertising or marketing purposes
- Access any Google Drive files outside the "PropertyVault" folder
- Train AI models on your data

## Data Storage & Security

- **Database**: Your account and property data is stored in a Supabase PostgreSQL database with Row Level Security (RLS) enabled — each user can only access their own data
- **Documents**: Stored in your personal Google Drive, not on our servers
- **Encryption**: All data is transmitted over HTTPS/TLS
- **Access Control**: Authentication is handled by Supabase Auth with Google OAuth 2.0

## Google API Usage

We request the following Google OAuth scopes:
- **`email` and `profile`**: To identify you and display your name/avatar
- **`drive.file`**: To create and manage files **only** within the PropertyVault folder in your Google Drive — we cannot access any other files in your Drive

Our use of Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Data Retention

- Your data is retained as long as you maintain an active account
- You may delete individual properties and documents at any time through the app
- Documents deleted through the app are also removed from your Google Drive

## Your Rights

You have the right to:
- **Access**: View all data we hold about you through the app
- **Delete**: Remove your properties, documents, and account data
- **Revoke Access**: Revoke our Google Drive access at any time via your [Google Account Permissions](https://myaccount.google.com/permissions)
- **Export**: Your documents are already in your Google Drive and fully accessible to you

## Third-Party Services

We use the following third-party services:
| Service | Purpose | Privacy Policy |
|---------|---------|----------------|
| [Google](https://policies.google.com/privacy) | Authentication & Drive storage | Google Privacy Policy |
| [Supabase](https://supabase.com/privacy) | Database & authentication | Supabase Privacy Policy |
| [Vercel](https://vercel.com/legal/privacy-policy) | Application hosting | Vercel Privacy Policy |

## Children's Privacy

This service is not directed to individuals under the age of 13. We do not knowingly collect personal information from children.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify users of material changes by updating the "Last Updated" date at the top of this page.

---

*This privacy policy applies to the Superplot application hosted at superplot.vercel.app.*

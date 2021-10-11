# Setup

- Create a new client in Azure AD and Generate a new client-secret
- Grant access to `Application.ReadWrite.All` & `AppRoleAssignment.ReadWrite.All` permissions on Microsft Graph API.
- Rename `.env.sample` to `.env` and update `DP_CLIENT_ID` & `DP_CLIENT_SECRET` to the above client.

```bash
npm i
npm start
```

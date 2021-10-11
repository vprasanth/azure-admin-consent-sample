import fetch from "node-fetch";
import FormData from "form-data";
import env from "dotenv";
env.config();

const GraphBaseUrl = "https://graph.microsoft.com/v1.0";

const getToken = async (
  adDomain: string,
  clientID: string,
  clientSecret: string
) => {
  const form = new FormData();
  form.append("grant_type", "client_credentials");
  form.append("client_id", clientID);
  form.append("client_secret", clientSecret);
  form.append("scope", "https://graph.microsoft.com/.default");

  const url = `https://login.microsoftonline.com/${adDomain}/oauth2/v2.0/token`;

  const resp = await fetch(url, {
    method: "post",
    body: form,
  });

  const { access_token: accessToken } = await resp.json();
  return accessToken;
};

const addClient = async (
  clientName: string,
  redirectUrl: string,
  accessToken: string
) => {
  console.log("creating client");

  const roleAccess = [
    {
      id: "df021288-bdef-4463-88db-98f22de89214",
      type: "Role",
    },
  ];

  const MsGraphApiResourceId = "cdda7614-2e93-4da5-b169-bcfdb04bf975";

  let resp = await fetch(GraphBaseUrl + "/applications", {
    headers: {
      "authorization": "Bearer " + accessToken,
      "content-type": "application/json",
    },
    method: "post",
    body: JSON.stringify({
      displayName: clientName,
      web: {
        redirectUris: [redirectUrl],
      },
      requiredResourceAccess: [
        {
          resourceAppId: "00000003-0000-0000-c000-000000000000",
          resourceAccess: roleAccess,
        },
      ],
    }),
  });
  let json = await resp.json();
  console.dir(json);
  const { appId, id: objectId } = json;

  console.log("creating credentials");
  const aurl = GraphBaseUrl + `/applications/${objectId}/addPassword`;
  resp = await fetch(aurl, {
    headers: {
      "authorization": "Bearer " + accessToken,
      "content-type": "application/json",
    },
    method: "post",
    body: JSON.stringify({
      passwordCredential: {
        displayName: "a0-client-secret",
        endDateTime: "2034-01-01T00:00:00Z",
      },
    }),
  });

  json = await resp.json();
  console.dir(json);
  const { secretText: clientSecret } = json;

  console.log("creating servicePrincipal");
  const spUrl = GraphBaseUrl + "/servicePrincipals";
  resp = await fetch(spUrl, {
    headers: {
      "authorization": "Bearer " + accessToken,
      "content-type": "application/json",
    },
    method: "post",
    body: JSON.stringify({ appId }),
  });

  json = await resp.json();
  console.dir(json);
  const { id: servicePrincipalId } = json;

  const spRolesUrl =
    GraphBaseUrl +
    `/servicePrincipals/${servicePrincipalId}/appRoleAssignments`;

  const roleAssignJobs = roleAccess.map((role) =>
    fetch(spRolesUrl, {
      headers: {
        "authorization": "Bearer " + accessToken,
        "content-type": "application/json",
      },
      method: "post",
      body: JSON.stringify({
        appRoleId: role.id,
        principalId: servicePrincipalId,
        resourceId: MsGraphApiResourceId,
      }),
    })
      .then(async (r) => await r.json())
      .then((j) => console.dir(j))
  );

  console.log("assigning required roles");
  await Promise.all(roleAssignJobs);

  return {
    appId: objectId,
    clientID: appId,
    clientSecret,
    servicePrincipalId,
    redirectUrl,
  };
};

async function main() {
  const {
    DP_CLIENT_ID: clientID,
    DP_CLIENT_SECRET: clientSecret,
    AD_DOMAIN: adDomain,
    DEMO_NAME: demoName,
  } = process.env;

  const accessToken = await getToken(
    <string>adDomain,
    <string>clientID,
    <string>clientSecret
  );

  const a0ConnectionSettings = await addClient(
    <string>demoName,
    "https://1click.auth0.com/login/callback",
    accessToken
  );

  console.log(a0ConnectionSettings);
}

main();

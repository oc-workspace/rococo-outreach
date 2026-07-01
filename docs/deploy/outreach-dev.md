# outreach-dev Deployment

Rococo Outreach dev is deployed from `/work/oc-projects/rococo-outreach`.

## Port

Default host port: `3107`.

## Commands

```bash
cd /work/oc-projects/rococo-outreach
oc-deploy rococo-outreach deploy
oc-deploy rococo-outreach status
oc-deploy rococo-outreach logs
oc-domain bind outreach-dev.rococo.dev rococo-outreach 3107
oc-domain status outreach-dev.rococo.dev
```

The app container exposes port `3000`; compose maps host `3107` to container `3000`.

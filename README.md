## TBD
- Split out internal API vs external (third party) API. Move third party to seperate www. Internal should only serve one site.
- Third party API needs to have middleware, rate limits etc
- Alt

## About
This is backend code for internal WWW. Uses TW on frontend, nginx/express/postgres on backend. Houses seperate displayed HTML endpoint as well as API endpoints with standard oath v2 (RFC 6750) authentication.
Keep contained within CF Zero Trust.


## NPM installation:
curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh

## Using PM2:
# https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-22-04
# https://node-postgres.com/features/queries
# https://www.loginradius.com/blog/engineering/hashing-user-passwords-using-bcryptjs/
- Install pm2 globally: npm install pm2 -g
- Start application: pm2 start app.js --name <app_name>
- List: pm2 list
- To automate startup: pm2 startup (copy-paste as needed)
- Save app list to be rebooted at reboot: pm2 save
- To end automation: pm2 unstartup [run unstartup and startup after node update]
- To restart: pm2 reload

## [v0.01]
- Added initial Express API build 
- Added initial docs build



## NPM installation:
`curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh`

## Using PM2:
- Install pm2 globally: npm install pm2 -g
- Start application: pm2 start app.js --name <app_name>
- List: pm2 list
- To automate startup: pm2 startup (copy-paste as needed)
- Save app list to be rebooted at reboot: pm2 save
- To end automation: pm2 unstartup [run unstartup and startup after node update]
- To restart: pm2 reload

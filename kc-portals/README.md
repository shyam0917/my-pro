# How to build (uses gulp babel node requirejs)

1. Clone repository
2. Install node.js, npm and packages. 

- node.js https://nodejs.org/en/

```
#!bash

# Using Ubuntu
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
```

```
#!bash

# Using CentOS
yum install -y gcc-c++ make
curl -sL https://rpm.nodesource.com/setup_6.x | sudo -E bash -
yum install nodejs
```


- run `npm install npm@latest -g` in console
(Node comes with npm installed so you should have a version of npm. However, npm gets updated more frequently than Node does, so you'll want to make sure it's the latest version.)
- run `npm install --global gulp-cli` It will add gulp command to command line
- run `npm install` in PROJECT PATH (where you cloned this repo) to install npm packages

3. Run `gulp dev` in project path before start working. It will switch html to use non-bundled file.
4. Edit code
5. Run `gulp build`. It will compile bundle.js, transpile it to ES5, add version hash and inject it into html.
6. Commit.
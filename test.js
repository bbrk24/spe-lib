#!/usr/bin/env node

const fs = require('fs');
for (const file of fs.readdirSync('tests')) {
    require(`./tests/${file}`);
}

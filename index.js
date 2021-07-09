// Core modules
const { execSync } = require('child_process');
const dns = require('dns');

// System config
const defaults = {
  totalChecks   : 12,     // Total number of checks to make at each interval
  checkSpacing  : 0.5,    // Seconds between each check
  checkTimeout  : 2,      // Maximum number of seconds a check can take before failing
  checkInterval : 10,     // Total seconds for each round of checks
  verbose       : false,  // Show log messages
  resetCommand  : 'nmcli radio wifi off && nmcli radio wifi on', // Command to run when internet is down
  hostsList     : 'agtos0'.split('').map(char => `${char}.co`),  // Hosts to randomly pick from
  notify        : _ => console.log(_), // Function to send notifications
};

/**
* Continuously monitor the internet connection and reset the device when offline.
* 
*/
function autoReset(config = {}) { 
  // Import user config replacing system params
  config = { ...defaults, ...config };

  // Print info
  if (config.verbose) {
    config.notify(`Monitoring internet connection...${config.verbose ? ' (verbose)' : ''}`);
  }

  // Immediately check state
  checkConnectionMulti(config);

  // Schedule regular checks
  setInterval(_ => checkConnectionMulti(config), config.checkInterval * 1000);
}

/**
* Perform multiple connection checks and reset only if they all fail
* 
* @param {object} config 
*/
function checkConnectionMulti(config) {
  return Promise.all([...Array(config.totalChecks).keys()]
    .map(t => new Promise(r => setTimeout(
      _ => checkConnection(config).then(r), 
      t * config.checkSpacing * 1000
    )))
  ).then(results => {
    if (config.verbose) {
      config.notify(`Responses:`, results.map(v => +v).join(''));
    }

    return !results.filter(_ => _).length ? reset(config, results) : 0
  });
}

/**
* Check if we are connected to the internet by attempting to resolve the dns 
* for one random host.
* 
* @param {object} config 
*/
function checkConnection(config) {
  if (config.verbose) {
    config.notify(`Checking connection... [${new Date().toLocaleString()}]`);
  }

  // Choose a host to check at random 
  const host = config.hostsList[Math.floor(Math.random() * config.hostsList.length)];
  
  return new Promise(r => dns.resolve(host, e => r(!e)) 
    && setTimeout(_ => r(false), config.checkTimeout * 1000));
}

/**
* Reset the wireless adapter
* 
* @param {object} config 
* @param {array} checks 
*/
function reset(config, checks = false) {
  config.notify(`Running reset... [${new Date().toLocaleString()}]`, checks.map(v => +v).join(''));

  execSync(config.resetCommand);
}

module.exports = autoReset;
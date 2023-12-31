// Core modules
const { execSync } = require('child_process');

// System config
const defaults = {
  totalChecks   : 4,     // Total number of checks to make at each interval
  checkSpacing  : 1,    // Seconds between each check
  checkTimeout  : 3,      // Maximum number of seconds a check can take before failing
  verbose       : false,  // Show log messages
  resetCommand  : 'nmcli radio wifi off && nmcli radio wifi on', // Command to run when internet is down
  hostsList     : 'agtos'.split('').map(char => `${char}.co`),  // Hosts to randomly pick from
  notify        : (message, arr = '') => console.log(`[${new Date().toLocaleTimeString()}] ${message}`, arr), // Function to send notifications
};

const logs = {
  total : 0,
  average: 0,
}

/**
* Continuously monitor the internet connection and reset the device when offline.
*
*/
async function autoReset(config = {}) {
  // Import user config replacing system params
  config = { ...defaults, ...config };

  // Print info
  if (config.verbose) {
    config.notify(`Monitoring internet connection...${config.verbose ? ' (verbose)' : ''}`);
  }

  while (true) {
    await checkConnectionMulti(config)
    await new Promise(r => setTimeout(r, 1000));
  }
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
    const res = results.map(v => +v)
    const sum = res.reduce((a, b) => a + b)
    logs.total++;
    logs.average = logs.average * (logs.total - 1) / logs.total + (sum / config.totalChecks) / logs.total;

    if (config.verbose) {
      config.notify(`Responses:  ${res.join('')}  ${logs.average.toFixed(4) * 100}%`);
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
    config.notify(`Checking connection...`);
  }

  // Choose a host to check at random
  const host = config.hostsList[Math.floor(Math.random() * config.hostsList.length)];

  return new Promise(r => {
    try {
      execSync(`ping -c 1 -w ${config.checkTimeout} ${host}`, { stdio: 'ignore' })
    } catch (error) {
      return r(false)
    }

    return r(true)
  });
}

/**
* Reset the wireless adapter
*
* @param {object} config
* @param {array} checks
*/
function reset(config, checks = false) {
  config.notify(`Running reset...`, checks.map(v => +v).join(''));

  execSync(config.resetCommand);
}

module.exports = autoReset
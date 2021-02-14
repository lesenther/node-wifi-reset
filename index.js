 // Core modules
 const { execSync } = require('child_process');
 const dns = require('dns');
 
 // System config
 const defaults = {
   totalChecks   : 12,     // Total number of checks to make at each interval
   checkSpacing  : 0.5,    // Seconds between each check
   checkTimeout  : 2,      // Maximum number of seconds a check can take before failing
   checkInterval : 10,     // Total seconds for each round of checks
   verbose       : true,  // Show log messages
 };
 
 // List of short (*.co) hosts to use for checks
 const LIST_SHORT_HOSTS = 'agtos0'.split('');
 
 /**
  * Continuously monitor the internet connection and reset the device when offline.
  * 
  */
 function autoReset(config = defaults) {
   console.log('Monitoring internet connection...');
 
   // Import user config replacing system params
   config = { ...defaults, ...config };
 
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
   const attempts = [...Array(config.totalChecks).keys()];
 
   return Promise.all(attempts.map(t => new Promise(r => setTimeout(
     _ => checkConnection(config).then(r), 
     t * config.checkSpacing * 1000
   ))))
   .then(results => (config.verbose && !console.log(results.map(v => +v).join(''))) 
     || !results.filter(_ => _).length ? reset(config, results) : 0
   );
 }
 
 /**
  * Check if we are connected to the internet by attempting to resolve the dns 
  * for one random host.
  * 
  * @param {object} config 
  */
 function checkConnection(config) {
   config.verbose && console.log(`Checking connection... [${new Date().toLocaleString()}]`);
 
   // Choose a host to check at random 
   const host = `${LIST_SHORT_HOSTS[Math.floor(Math.random() * LIST_SHORT_HOSTS.length)]}.co`;
   
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
   console.log(`Running reset... [${new Date().toLocaleString()}] ${config.verbose ? '(verbose)' : ''}`, checks.map(v => +v).join(''));
 
   execSync(`nmcli radio wifi off && nmcli radio wifi on`);
 }
 
 module.exports = autoReset;
const { execSync } = require('child_process')

class wifiReset {

  /**
  * Constructor
  *
  * @param {object} conf
  */
  constructor(conf = {}) {
    if (conf.hasOwnProperty('log') && typeof conf.log === 'function') {
      this.log = conf.log
      delete conf.log
    }

    this.conf = {
      // Total samples to collect (all must fail to reset)
      samples: 4,
      // Seconds between each sample
      interval: 1,
      // Maximum number of seconds a check can take before failing
      timeout: 1,
      // Show log messages
      verbose: false,
      // Command to run when internet is down
      reset: 'nmcli radio wifi off && sleep 5 && nmcli radio wifi on',
      // Hosts from which to randomly pick
      hosts: 'agost'.split('').map(_ => `${_}.co`),
      // Check methods from which to randomly use
      checkMethods: [
        `nc -z -w $timeout $host 443`,
        `ping -c 1 -W $timeout $host`,
      ],
      // User conf
      ...conf,
    }

    this.stats = {
      total: 0,
      average: 0,
    }

    this.monitor()
  }

  /**
   * Routine to monitor internet
   */
  async monitor() {
    this.log(`Monitoring internet connection... ${this.conf.verbose ? ' (verbose)' : ''}`)

    while (true) {
      const results = []

      for (let i = 0; i < this.conf.samples; i++) {
        await new Promise(r => setTimeout(r, this.conf.interval * 1000))
        results.push(this.check(this.conf.hosts[Math.floor(Math.random() * this.conf.hosts.length)]))
      }

      const resolved = await Promise.all(results)
      const average = resolved.reduce((a, b) => a + b) / this.conf.samples;
      this.stats.total++;
      this.stats.average = average / this.stats.total
        + this.stats.average * (this.stats.total - 1) / this.stats.total

      this.log(`Responses:  ${average.toFixed(4) * 100}%, Cum: ${this.stats.average.toFixed(4) * 100}%`);

      if (resolved.filter(_ => _).length) {
        continue
      }

      try {
        this.log(`Resetting wifi...`)
        execSync(this.conf.reset)
      } catch (error) {
        this.log(`Error:  ${error}`)
      }
    }
  }

  check(host) {
    const command = this.conf.checkMethods[Math.floor(Math.random() * this.conf.checkMethods.length)]
      .replace('$host', host)
      .replace('$timeout', this.conf.timeout)

    this.log(`Checking host ${host} [${command}]...`)

    return new Promise(resolve => {
      try {
        execSync(command, { stdio: 'ignore' })
        return resolve(1)
      } catch (error) {
        return resolve(0)
      }
    });
  }

  log(message, arr = '') {
    if (this.conf.verbose) {
      console.log(`[${new Date().toLocaleTimeString()}] ${message}`, arr)
    }
  }
}

module.exports = wifiReset
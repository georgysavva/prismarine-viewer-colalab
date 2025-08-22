module.exports = {
  mineflayer: require('./lib/mineflayer'),
  // freecamera: require('./lib/freecamera'),
  freecamera: require('./lib/freecamera-base64'),
  standalone: require('./lib/standalone'),
  headless: require('./lib/headless'),
  // headless: require('./lib/headless-base64'),
  viewer: require('./viewer'),
  supportedVersions: require('./viewer').supportedVersions
}

/* ensure Date JSON consistent in Node 20 */
if (!Date.prototype.toJSON) {
  // noop for modern node
}

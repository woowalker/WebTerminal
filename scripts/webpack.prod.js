var merge = require('webpack-merge')
var UglifyJSPlugin = require('uglifyjs-webpack-plugin')
var common = require('./webpack.common.js')

module.exports = merge(common, {
  plugins: [
    new UglifyJSPlugin({
      uglifyOptions: {
        ie8: false,
        dead_code: true,
        output: {
          comments: false,
          beautify: false
        }
      }
    })
  ]
})

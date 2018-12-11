var path = require('path')
var CleanWebpackPlugin = require('clean-webpack-plugin')
var CopyWebpackPlugin = require('copy-webpack-plugin')
var ExtractTextPlugin = require('extract-text-webpack-plugin')

module.exports = {
  context: path.resolve('__dirname', '../'),
  entry: {
    terminal: './client/src/client.js'
  },
  plugins: [
    new CleanWebpackPlugin(['client/public'], {
      root: path.resolve('__dirname', '../'),
      verbose: true
    }),
    new CopyWebpackPlugin([
      './client/src/index.html',
      './client/src/favicon.ico'
    ]),
    new ExtractTextPlugin('[name].css')
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '../client/public')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [{loader: 'css-loader', options: {minimize: {discardComments: { removeAll: true }}}}]
        })
      },
      {
        test: /\.less$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'less-loader']
        })
      }
    ]
  }
}

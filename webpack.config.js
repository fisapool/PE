const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    popup: './src/popup.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: ['html-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: "manifest.json", 
          to: "manifest.json",
          transform(content) {
            // Ensure correct paths in manifest
            const manifest = JSON.parse(content.toString());
            manifest.background.service_worker = "background.bundle.js";
            return JSON.stringify(manifest, null, 2);
          }
        },
        { from: "icons", to: "icons" }
      ],
    }),
  ],
  resolve: {
    extensions: ['.js'],
    alias: {
      'firebase': path.resolve(__dirname, 'node_modules/firebase')
    }
  },
};
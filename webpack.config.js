import dotenv from "dotenv"
import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import {fileURLToPath} from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
       mode: process.env.NODE_ENV,
       entry: path.resolve(__dirname, "scripts/script.jsx"),
       output: {
              path: path.resolve(__dirname, "public"),
              filename: "bundle.js",
              publicPath: "/",
       },
       module: {
              rules: [
              {
                     test: /\.(js|jsx)$/,
                     exclude: /node_modules/,
                     use: {
                            loader: "babel-loader",
                            options: {
                                   presets: ['@babel/preset-env', '@babel/preset-react'],
                                   cacheDirectory: true,
                            },
                     },
              },
              {
                     test: /\.(sa|sc|c)ss$/,
                     use: [
                            'style-loader',
                            'css-loader',
                            'sass-loader',
                     ],
              },
              ],
       },
       resolve: {
              extensions: ['.js', '.jsx', ".scss"],
       },
       plugins: [
              new HtmlWebpackPlugin({
                     template: path.resolve(__dirname, 'public/index.html'),
              }),
       ],
       devtool: 'cheap-module-source-map',
       devServer: {
              static: path.join(__dirname, "public"),
              compress: true,
              hot: true,
              historyApiFallback: true,
              port: process.argv[2],
       },
};
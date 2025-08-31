const path = require('path');

module.exports = {
    entry: './renderer/js/index.js',
    output: {
        path: path.resolve(__dirname, 'renderer/js'),
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react']
                    }
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx']
    },
    target: 'electron-renderer'
};
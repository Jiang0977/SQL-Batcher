const path = require('path');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    
    return {
        entry: './renderer/js/index.js',
        output: {
            path: path.resolve(__dirname, 'renderer/js'),
            filename: 'bundle.js'
        },
        // 根据环境选择合适的devtool，避免使用eval以符合CSP策略
        devtool: isProduction ? 'nosources-source-map' : 'source-map',
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
};
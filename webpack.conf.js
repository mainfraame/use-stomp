const path = require('path');

const devMode = process.env.NODE_ENV !== 'production';

module.exports = {
    cache: true,
    devtool: 'source-map',
    mode: 'production',
    entry: [path.resolve(process.cwd(), './src/webSocketWorkerInstance.ts')],
    output: {
        filename: 'webSocketWorkerInstance.js',
        path: path.resolve(process.cwd(), './'),
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.(cjs|js|jsx|ts|tsx)$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: devMode
                        }
                    }
                ],
                exclude: [
                    /[\\/]node_modules[\\/](?!(clone-deep|copy-text-to-clipboard|flexboxgrid|lodash-es|shallow-clone)[\\/])/
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.cjs', '.js', '.jsx', '.json', '.ts', '.tsx'],
        modules: [path.join(process.cwd(), './node_modules'), 'node_modules']
    }
};

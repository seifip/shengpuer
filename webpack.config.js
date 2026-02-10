const path = require('path');

module.exports = {
    entry: './src/index.ts',
    devtool: 'source-map',
    target: 'web',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json', '.css'],
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 9000,
    },
    module: {
        rules: [
            {
                test: /\.mjs$/,
                include: /node_modules/,
                type: 'javascript/auto',
            },
            {
                test: /\.glsl$/,
                exclude: /node_modules/,
                use: [{ loader: 'webpack-glsl-minify' }],
            },
            {
                test: /\.worker\.ts$/,
                use: [
                    { loader: 'babel-loader' },
                    {
                        loader: 'worker-loader',
                        options: {
                            filename: '[contenthash].worker.js',
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
            {
                test: /\.m?js$/,
                include: /[\\/](@radix-ui|class-variance-authority|tailwind-merge|vaul|lucide-react)[\\/]/,
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env', '@babel/preset-react'],
                    plugins: [
                        '@babel/plugin-transform-optional-chaining',
                        '@babel/plugin-transform-nullish-coalescing-operator',
                        '@babel/plugin-transform-class-properties',
                    ],
                },
            },
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
        ],
    },
};

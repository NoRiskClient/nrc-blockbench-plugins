const PathModule = require('path')

module.exports = {
    mode: 'development',
    devtool: false,
    cache: false,
    entry: './ts/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                // The skin-renderer dist is ESM with extensionless imports.
                test: /\.m?js$/,
                resolve: { fullySpecified: false },
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        symlinks: false,
    },
    externals: {
        fs: 'commonjs fs',
        os: 'commonjs os',
        path: 'commonjs path',
        buffer: 'commonjs buffer',
    },
    output: {
        filename: 'nrc_cosmetics.js',
        path: PathModule.resolve(__dirname, '..')
    }
}

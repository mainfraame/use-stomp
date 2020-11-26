module.exports = (app) => {
    const baseConfig = {
        presets: ['@babel/preset-react', '@babel/typescript'],
        plugins: [
            ['babel-plugin-set-display-name', {setName: true}],
            '@babel/plugin-transform-react-constant-elements',
            [
                '@babel/plugin-proposal-decorators',
                {
                    legacy: true
                }
            ],
            [
                '@babel/plugin-proposal-class-properties',
                {
                    loose: true
                }
            ],
            [
                '@babel/plugin-transform-typescript',
                {
                    isTSX: true
                }
            ],
            '@babel/plugin-transform-runtime'
        ]
    };

    return {
        presets: [
            ...baseConfig.presets,
            ...(app.env('test')
                ? [
                      [
                          '@babel/preset-env',
                          {
                              targets: {
                                  node: 'current'
                              }
                          }
                      ]
                  ]
                : [
                      [
                          '@babel/preset-env',
                          {
                              targets: {
                                  browsers: ['last 2 versions']
                              },
                              corejs: 3,
                              useBuiltIns: 'usage',
                              ...(process.env.IS_ESM ? {modules: false} : {})
                          }
                      ]
                  ])
        ],
        plugins: baseConfig.plugins
    };
};

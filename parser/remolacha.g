{
  moduleInclude : `
    // Can be "require" statments, or direct declarations.
  `, 

  lex : {
    macros: {
      identifier: `[a-zA-Z0-9_]`,
    },

    rules: [
      ["\\/\\/.*",                `/* skip comments */`],
      ["\/\\*(.|\\s)*?\\*\/",     `/* skip comments */`],
      [`\\s+`,                    `/* skip whitespace */`],

      // ------------------------------------------------
      // Keywords.
      [`class`,                 `return 'KEY_CLASE'`],
      [`local`,                 `return 'KEY_LOCAL'`],
      [`def`,                   `return 'KEY_METODO'`],
      [`set`,                   `return 'KEY_SET'`],
      [`new`,                   `return 'KEY_NEW'`],
      // ------------------------------------------------
      // Symbols.
      [`\\=`,                     `return 'SYM_EQUALS'`],
      [`\\(`,                     `return 'SYM_LPAREN'`],
      [`\\)`,                     `return 'SYM_RPAREN'`],
      [`\\,`,                     `return 'SYM_COMMA'`],
      [`\\.`,                    `return 'SYM_DOT'`],
      // ------------------------------------------------

      [`(\\d+(\\.\\d+)?)`,        `return 'NUM'`],
      [`"[^"]*"`,                 `yytext = yytext.slice(1, -1); return 'STRING';`],
      [`'[^']*'`,                 `yytext = yytext.slice(1, -1); return 'STRING';`],
      [`{identifier}+`,           `return 'ID'`],
    ],
  },

  bnf : {
    programa : [
      [ `ε`,                      `$$ = []` ],
      /*[ `NUM`,                  `$$ = []` ],
      [ `KEY_CLASE`,              `$$ = []` ],*/
      [ `clase programa`,         `$2.unshift($1); $$ = $2` ]
    ],
    clase : [
      // [`SYM_DOT`, `$$ = { type : 'clase' }` ]
      [`KEY_CLASE ID locales metodos`, `$$ = { type : 'clase', id : $2, locations : @1, locales : $3, metodos : $4 }` ]
    ],
    locales : [
      [ `ε`,                      `$$ = []` ],
      [ `KEY_LOCAL ID locales`,   `$3.unshift({ id : $2, locations : @2}); $$ = $3` ]
    ],
    metodos : [
      [ `ε`,                      `$$ = []` ],
      [ `metodo metodos`,         `$2.unshift($1); $$ = $2` ]
    ],
    metodo : [
      [`KEY_METODO ID parametros bloque`, `$$ = { type : 'metodo', id : $2, locations : @1, parametros : $3, bloque : $4 }` ]
    ],
    parametros : [
      [ `SYM_LPAREN parametros1 SYM_RPAREN` ,  `$$ = $2`  ]
    ],
    parametros1 : [
      [ `ε` ,                       `$$ = []` ],
      [ `ID masParametros`,         `$2.unshift({id : $1, locations: @1}); $$ = $2`]
    ],
    masParametros : [
      [ `ε` ,                        `$$ = []` ],
      [`SYM_COMMA ID masParametros`, `$3.unshift({id:$2, locations : @2}); $$ = $3`]
    ],
    bloque : [
      [ `ε` ,                        `$$ = []` ],
      [`expresion bloque`,           `$2.unshift($1); $$ = $2`]
    ],
    expresion : [
      [`KEY_SET ID SYM_EQUALS expresion`, `$$ = { type : 'set', locations : @1, id : $2, valor : $4}`],
      [`atomo expresion_cont`,            `$$ = { type : 'atomo', locations : @1, atomo : $1, expresion_cont : $2}`]
    ],
    expresion_cont : [
      [ `ε` ,                                   `$$ = []` ],
      [`SYM_DOT ID argumentos expresion_cont`,  `$$ = { type : 'mensaje', id : $2, locations : @1, argumentos : $3, expresion_cont : $4 }`]
    ],
    atomo : [
      [`ID`,                                 `$$ = { type : 'variable', valor : $1}`],
      [`STRING`,                             `$$ = { type : 'stringConstant', valor : $1}`],
      [`NUM`,                                `$$ = { type : 'numConstant', valor : $1}`],
      [`KEY_SELF`,                           `$$ = { type : 'self'}`],
      [`KEY_NEW ID`,                         `$$ = { type : 'new', valor : $2}`],
      [`SYM_LPAREN expresion SYM_RPAREN` ,  `$$ = $2`  ]      
    ],
    argumentos : [
      [ `SYM_LPAREN argumentos1 SYM_RPAREN` ,  `$$ = $2`  ]
    ],
    argumentos1 : [
      [ `ε` ,                          `$$ = []` ],
      [`expresion masArgumentos`,      `$2.unshift($1); $$ = $2`]
    ],
    masArgumentos : [
      [ `ε` ,                                   `$$ = []` ],
      ["SYM_COMMA expresion masArgumentos", `$3.unshift($2); $$ = $3`]
    ]
  }
}
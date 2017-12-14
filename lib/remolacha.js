exports.compiler = RemolachaCompiler;

const 
  util                = require('util'),
  fs                  = require('fs'),
  uniqid              = require('uniqid'),
  remolachaParser     = require('../parser/remolacha.slr1.js'),
  CodeGenerator       = require('./code_generator').generator,
  Validator           = require('./validator').validator
;

const 
  G_CLASSESSANDSELECTORS_ID = 'G_CLASSESSANDSELECTORS_ID',
  G_PRIMITIVES_CODE         = 'G_PRIMITIVES_CODE',
  G_CLASSES_POINTERS        = 'G_CLASSES_POINTERS',
  G_MAIN                    = 'G_MAIN',
  G_CLASSES_CONSTRUCTORS    = 'G_CLASSES_CONSTRUCTORS',
  G_METHODS                 = 'G_METHODS'
;

const log = (prefix, item, depth) => console.log('true log : ', prefix, util.inspect(item, { colors: true, depth: depth }))

function parseFile(fileName){
  let read = fs.readFileSync(fileName, 'utf8')
  return remolachaParser.parse(read)
}

function RemolachaCompiler(options){

  const id = x => x;
  const alwaysFalse = _ => false;
  const alwaysTrue  = _ => true;
  const notExprAtom = type => ['variable', 'stringConstant', 'numConstant', 'self', 'new'].includes(type)

  const foldLine = ( aStruct = {}, {
      atomCondition     : atomCondition    = alwaysFalse,
      messageCondition  : messageCondition = alwaysFalse,
      setCondition      : setCondition     = alwaysFalse,
      atomReturn        : atomReturn       = id,
      messageReturn     : messageReturn    = id,
      setReturn         : setReturn        = id  } = {} ) => {
    let functions = arguments[2]

    return aStruct.type === 'atomo'
      ? notExprAtom(aStruct.atomo.type)
        ? ( atomCondition( aStruct ) ? [ atomReturn(aStruct) ] : [] )
          .concat(...foldLine( aStruct.expresion_cont, functions ))
        : foldLine(aStruct.atomo, functions)
      : aStruct.type === 'mensaje'
        ? ( messageCondition(aStruct) ? [ messageReturn(aStruct) ] : [] )
          .concat(aStruct.argumentos.map( arg => foldLine(arg, functions)))
          .concat(...foldLine(aStruct.expresion_cont, functions))
      : aStruct.type === 'set' 
        ? ( setCondition(aStruct) ? [ setReturn(aStruct) ] : [] )
          .concat(...foldLine(aStruct.valor, functions))
      : []
  };

  const self = this;
  
  const primitiveClasses = {
    'Int' : { caster : 'NUM_TO_PTR', type : 'Num' },
    'String' : { caster : 'STRING_TO_PTR', type : 'String' }
  }
  let classesName = []
  
  self.source = parseFile(options.sourceFile);
  self.compile = compile
  self.runValidations = runValidations

  const generator = new CodeGenerator()

  function runValidations(){
    classesName = self.source.map( current => current.id );
    const validator = new Validator( { foldLine : foldLine, source : self.source, classesName : classesName} )
    return validator.validations.reduce((carry, current)=>{
      let res = current.apply(self)
      res.step = current.name
      return carry.concat( res )
    }, [])
  }

  const appendToOutput = ( context, result ) => context.output.push(result)

  const compilationSteps = [
    { callback : generateClassesAndSelectorsIds, description : G_CLASSESSANDSELECTORS_ID, handleReturn : (context, result) => context.identifiers = result },
    { callback : generatePrimitivesCode, description : G_PRIMITIVES_CODE , handleReturn : appendToOutput },
    { callback : generateClasesPointers, description : G_CLASSES_POINTERS, handleReturn : appendToOutput },
    { callback : generateClasesConstructors, description : G_CLASSES_CONSTRUCTORS, handleReturn : appendToOutput },
    { callback : generateMethods, description : G_METHODS, handleReturn : appendToOutput },
    { callback : generateMain, description : G_MAIN, handleReturn : appendToOutput }
  ]

  function compile(compileOptions){

    let context = { 
      output : [ generator.header() ], 
      source : self.source, 
      primitiveClasses : primitiveClasses,
      primitiveNames : Object.keys(primitiveClasses),
      classesName : classesName,
      identifiers : undefined
    }
    
    compilationSteps.forEach( ( { callback : callback, description : description, handleReturn : handleReturn } ={} ) => {
      let res = callback.apply(self, [context])
      handleReturn(context, res);
    })
    if (options.showContext) log('context: ',context, 3);
    fs.writeFileSync(options.outputFile, context.output.join(''))
  }

  function generateMain(context){
    let classData = context.source.map(current=>({
      classId : context.identifiers.classesId[current.id],
      class : current.id,
      methods : current.metodos.map( method => ({ 
        method : method.id, 
        methodId : context.identifiers.selectorsId[method.id+'/'+method.parametros.length],
        selector : method.id + '/' + method.parametros.length
      }))
    })) 
    return generator.generateMainCode(classData, Object.keys(context.identifiers.selectorsId))
  }

  function generateMethods(context){
    return [].concat(...context.source.map(current=>
      current.metodos.map( method => 
        ({ 
          class : current.id,
          method : method.id, 
          classId : context.identifiers.classesId[current.id],
          methodId : context.identifiers.selectorsId[method.id+'/'+method.parametros.length],
          block : method.bloque,
          params : method.parametros.length,
          selector : method.id + '/' + method.parametros.length
         })
      )
    )).map( generator.generateMethodsCode ).join('\n') + '\n'
  }

  function generateClasesConstructors(context){
    return context.classesName.map( current => {
      let locales = context.source.find( x => x.id === current).locales
      return generator.classesConstructors(current, context.identifiers.classesId[current], locales, context.identifiers.classesId['Int'] )
    } 
    ).join('\n') + '\n'
  }

  function generateClasesPointers(context){
    return context.classesName.map( 
      current => generator.classPointers(current, context.identifiers.classesId[current] )
    ).join('\n') + '\n'
  }

  function generatePrimitivesCode(context){
    let classCode = context.primitiveNames.map( 
      primitive =>
        generator.primitivePointer(primitive, context.identifiers.classesId[primitive])
    ).join('\n') + '\n'

    let constructorCode = context.primitiveNames.map(
      primitive => 
        generator.primitiveConstructor(
          primitive,
          context.identifiers.classesId[primitive],
          context.primitiveClasses[primitive].type,
          context.primitiveClasses[primitive].caster
        )
    ).join('\n') + '\n'

    return classCode + constructorCode
  }

  function generateClassesAndSelectorsIds(context){

    let findSelectors = line =>
      foldLine ( line, { messageCondition : alwaysTrue, messageReturn : message => message.id+'/'+message.argumentos.length } )
    
    let classesToId = context.primitiveNames.concat(context.classesName).reduce((carry, current) => {
      carry[current] = uniqid('cls_')
      return carry
    }, {})

    let selectorsCollection = context.source.reduce((carry, current) => {  
      let selectors = [].concat(...current.metodos.map( method => [].concat(...method.bloque.map(findSelectors))))
      let methods   = [].concat(...current.metodos.map( method => method.id + '/' + method.parametros.length ))

      return carry.concat(selectors,methods)
    }, [])

    let selectorsToId = [... new Set(selectorsCollection)].reduce((carry, current) => {
      carry[current] = uniqid('sel_')
      return carry
    }, {})

    return { classesId : classesToId, selectorsId : selectorsToId }
  }
 
}
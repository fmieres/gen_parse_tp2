exports.validator = StructureValidator;

const 
  VerificationHandler = require('./verification_handler').handler
;

const 
  S_CLASS  = 'clase',
  S_METODO = 'metodo',
  S_MAIN   = 'Main',
  S_MAIN_L = 'main'
;

function StructureValidator(options){

  const self = this
  const handler = new VerificationHandler();
  const classesName = options.classesName
  const foldLine = options.foldLine

  self.source = options.source

  self.validations = [
    verification_1,
    verification_2,
    verification_3,
    verification_4,
    verification_5,
    verification_6,
    verification_7,
    verification_8,
    verification_9,
    verification_10
  ];

  const stringCompare = ( a, b ) => a >= b ? a == b ? 0 : 1 : -1 ;

  function getDuplcates(sorted_arr){
    let duplicates = [];
    for (let i = 0; i < sorted_arr.length - 1; i++) {
      if (sorted_arr[i + 1] == sorted_arr[i]) {
        duplicates.push(sorted_arr[i]);
      }
    }
    return duplicates
  }

  function verification_1(){  
    let main = self.source.filter( current => current.type === S_CLASS && current.id === S_MAIN )[0];
    let ret = {};

    if (!!main){
      let mainMethod = main.metodos.filter( current => current.type === S_METODO && current.id === S_MAIN_L && current.parametros.length === 0 )[0];
      ret = !!mainMethod 
        ? handler.handle_ok()
        : handler.handle_main_noMainMethod(main)
    } else {
      ret = handler.handle_main_noMain()
    }
    return ret
  }

  function verification_2(){    
    let duplicates = getDuplcates(classesName.slice().sort())

    return duplicates.length === 0 
      ? handler.handle_ok()
      : handler.handle_classes_duplicates(self.source, duplicates)
  }

  function verification_3(){

    const formatSignature = ( method, paramsCount ) => method + '_' + ((Array(5).fill(0)).join('') + paramsCount).substr(-5)

    let duplicatedData = self.source.reduce((carry, current) => {
      let sortedMethods = current.metodos.map(
        method => ({ id : method.id, paramsCount : method.parametros.length, locations : method.locations , signature : formatSignature(method.id, method.parametros.length)})
      ).sort( (a, b ) => stringCompare (a.signature, b.signature) )
      let duplicates = getDuplcates(sortedMethods.map( current => current.signature ))

      return duplicates.length === 0 
        ? carry 
        : carry.concat({
          id : current.id,
          duplicates : sortedMethods.filter( current => duplicates.includes(current.signature) )
        })
    }, [])

    return duplicatedData.length === 0
      ? handler.handle_ok()
      : handler.handle_classes_duplicatedMethods(duplicatedData)
  }

  function verification_4(){
    let duplicatedData = self.source.reduce((carry, current)=>{
      let duplicates = getDuplcates(current.locales.map( current => current.id ).sort())

      return duplicates.length === 0 
        ? carry 
        : carry.concat({
          id : current.id,
          duplicates : current.locales.filter( current => duplicates.includes(current.id) )
        })

    }, [])
    return duplicatedData.length === 0
      ? handler.handle_ok()
      : handler.handle_classes_duplicatedLocals(duplicatedData)
  }

  function verification_5(){
    let duplicatedData = self.source.reduce((carry, current) => {
      let methodsDuplicated = current.metodos.reduce((carry, current) => {
        let paramsDuplicated = getDuplcates(current.parametros.map( current => current.id ).sort())
        return paramsDuplicated.length === 0
          ? carry 
          : carry.concat({
            id : current.id,
            duplicates : current.parametros.filter( current => paramsDuplicated.includes(current.id) )
          })
      }, [])
      return methodsDuplicated.length === 0 
        ? carry
        : carry.concat({
          id : current.id,
          duplicates : methodsDuplicated
        })
    }, [])

    return duplicatedData.length === 0 
      ? handler.handle_ok()
      : handler.handle_methods_duplicatedParameters(duplicatedData)
  }

  function verification_6(){
    let dupes = self.source.reduce((carry, current) => {
      let locals = current.locales.map(current => current.id)
      let astrayMethodParameters = current.metodos.reduce((carry, method) => {
        let astrayParams = method.parametros.filter( param => locals.includes(param.id) )
        let astrayParamsName = astrayParams.map( param => param.id )
        return astrayParams.length === 0 
          ? carry
          : carry.concat({
            method : method.id,
            parameters : astrayParams,
            locals : current.locales.filter( locale => astrayParamsName.includes(locale.id) )
          })
      }, [])

      return astrayMethodParameters.length === 0
        ? carry
        : carry.concat({
          id : current.id,
          duplicates : astrayMethodParameters
        })
    },[])
    
    return dupes.length === 0 
      ? handler.handle_ok()
      : handler.handle_methods_overlapLocals(dupes)
  }

  function verification_7(){
    return handler.handle_ok()
  }

  function verification_8(){

    let isAtomUndefined = (atom, allowed) => atom.type === 'variable' && !allowed.includes(atom.valor) && atom.valor !== 'self'

    let findUndefined = (allowed, aStruct) => foldLine( aStruct, { atomCondition : aStruct => isAtomUndefined(aStruct.atomo, allowed) , setCondition : aStruct => !allowed.includes(aStruct.id) , setReturn :  aStruct => ({ type : 'set', id : aStruct.id, locations : aStruct.locations }) } );

    let astrayUses = self.source.reduce( (carry, current) => {
      let locals = current.locales.map( current => current.id )
      let astrayReferencesInClaass = current.metodos.reduce((carry, method) => {
        let methodLocals = method.parametros.map( carry => carry.id ).concat(locals)
        let astrayReferences = [].concat(...method.bloque.map( line => findUndefined(methodLocals, line)))

        return astrayReferences.length === 0
          ? carry
          : carry.concat({
            id : method.id,
            undefinedReferences : astrayReferences
          })
      }, [])

      return astrayReferencesInClaass.length === 0
        ? carry
        : carry.concat({
          id : current.id,
          undefinedReferences : astrayReferencesInClaass
        })
    }, [])

    return astrayUses.length === 0 
      ? handler.handle_ok()
      : handler.handle_class_undefinedReferences(astrayUses)
  }

  function verification_9(){

    let isAtomNewUndefined = (atom, allowed) => atom.type === 'new' && !allowed.includes(atom.valor)

    let findUndefinedNew = (allowed, aStruct) => foldLine( aStruct, { atomCondition : aStruct => isAtomNewUndefined(aStruct.atomo, allowed) } )

    if ( classesName.length === 0 ) loadClassesName();    
    let undefinedNews = self.source.reduce( (carry, current) => {
      let undefinedNewsInMethods = current.metodos.reduce((carry, method) => {
        let undefinedNew = [].concat(...method.bloque.map( line  => findUndefinedNew(classesName, line) ))
        return undefinedNew.length === 0
          ? carry
          : carry.concat({
            id : method.id,
            undefinedReferences : undefinedNew
          })
      }, [])

      return undefinedNewsInMethods.length === 0
        ? carry
        : carry.concat({
          id : current.id,
          undefinedReferences : undefinedNewsInMethods
        })
    },[])

    return undefinedNews.length === 0
      ? handler.handle_ok()
      : handler.handle_classes_newUndefined(undefinedNews)
  }

  function verification_10(){
    return handler.handle_ok()
  }
  
}
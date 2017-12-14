exports.handler = VerificationHandler;

const
  E_MAIN_NOMAIN = 'E_MAIN_NOMAIN',
  E_MAIN_NOMAINMETHOD             = 'E_MAIN_NOMAINMETHOD',
  E_CLASSES_DUPLICATED            = 'E_CLASSES_DUPLICATED',
  E_CLASSES_DUPLICATEDLOCALS      = 'E_CLASSES_DUPLICATEDLOCALS',
  E_METHODS_DUPLICATEDPARAMETERS  = 'E_METHODS_DUPLICATEDPARAMETERS',
  E_METHODS_OVERLAPLOCALS         = 'E_METHODS_OVERLAPLOCALS',
  E_CLASS_UNDEFINEDREFERENCES     = 'E_CLASS_UNDEFINEDREFERENCES',
  E_HANDLE_CLASSES_NEWUNDEFINED   = 'E_HANDLE_CLASSES_NEWUNDEFINED',
  E_CLASSES_DUPLICATEDMETHODS     = 'E_CLASSES_DUPLICATEDMETHODS'

  // E_MAIN_NOMANY = ''
;

function VerificationHandler(options){
  
  const self = this
  
  self.handle_ok                            = handle_ok
  self.handle_main_noMain                   = handle_main_noMain
  self.handle_main_noMainMethod             = handle_main_noMainMethod
  self.handle_classes_duplicates            = handle_classes_duplicates
  self.handle_classes_duplicatedMethods     = handle_classes_duplicatedMethods
  self.handle_classes_duplicatedLocals      = handle_classes_duplicatedLocals
  self.handle_methods_duplicatedParameters  = handle_methods_duplicatedParameters
  self.handle_methods_overlapLocals         = handle_methods_overlapLocals
  self.handle_class_undefinedReferences     = handle_class_undefinedReferences
  self.handle_classes_newUndefined          = handle_classes_newUndefined

  function addLocation(locations){
    return ' line ' + locations.startLine + ', column ' + locations.startColumn
  }

  function handle_ok(main){
    return { error : false }
  }

  function handle_main_noMain(){
    return { error : true, label : E_MAIN_NOMAIN }
  }

  function handle_main_noMainMethod(main){
    return { error : true, label : E_MAIN_NOMAINMETHOD + addLocation(main.locations), locations : main.locations }
  }

  function handle_classes_duplicates(source, duplicates){
    let duplicatesData = duplicates.map(
      duplicated => ({
        locations : source.filter( current => current.id === duplicated ).map( current => ({
          startLine : current.locations.startLine,
          startColumn   : current.locations.startColumn  
        })),
        class     : duplicated 
      })
    )

    return {
      error      : true,
      label      : E_CLASSES_DUPLICATED, 
      duplicates : duplicatesData
    }

  }

  function handle_classes_duplicatedMethods(duplicates){ 

    return {
      error : true,
      label : E_CLASSES_DUPLICATEDMETHODS,
      duplicates : duplicates.map( 
        clazz => ({
          class : clazz.id,
          duplicates : clazz.duplicates.map(
            method => ({
              method : method.id,
              paramsCount : method.paramsCount,
              startLine : method.locations.startLine,
              startColumn : method.locations.startColumn
            })
          )
        })
      )
    }
  }

  function handle_classes_duplicatedLocals(duplicates){
    return {
      error : true,
      label : E_CLASSES_DUPLICATEDLOCALS,
      duplicates : duplicates.map(
        clazz => ({
          class : clazz.id,
          duplicates : clazz.duplicates.map(
            local => ({
              local : local.id,
              startLine : local.locations.startLine,
              startColumn : local.locations.startColumn
            })
          )
        })
      )
    }
  }

  function handle_methods_duplicatedParameters(duplicates){
    return {
      error : true,
      label : E_METHODS_DUPLICATEDPARAMETERS,
      duplicates : duplicates.map(
        clazz => ({
          class : clazz.id,
          duplicates : clazz.duplicates.map(
            method => ({
              method : method.id,
              dupliccates : method.duplicates.map(
                param => ({
                  param : param.id,
                  startLine : param.locations.startLine,
                  startColumn : param.locations.startColumn
                })
              )
            })
          )
        })
      )
    }
  }

  function handle_methods_overlapLocals(duplicates) {
    return {
      error : true,
      label : E_METHODS_OVERLAPLOCALS,
      duplicates : duplicates
    }
  }

  function handle_class_undefinedReferences(undefinedUses) {
    return {
      error : true,
      lalbel : E_CLASS_UNDEFINEDREFERENCES,
      undefinedUses : undefinedUses
    }
  }

  function handle_classes_newUndefined(undefinedNews){
    return {
      error : true,
      label : E_HANDLE_CLASSES_NEWUNDEFINED,
      undefinedUses : undefinedNews
    }
  }

}
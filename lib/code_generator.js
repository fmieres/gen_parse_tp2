exports.generator = CodeGenerator;

function CodeGenerator(options){

  const self = this

  self.header = header
  self.primitiveConstructor = primitiveConstructor
  self.primitivePointer = primitivePointer
  self.classPointers = classPointers
  self.classesConstructors = classesConstructors
  self.generateMethodsCode = generateMethodsCode_noCodeVariant
  self.generateMainCode = generateMainCode_noMainProgramVariant

  function header(){
    return `
#include <cstdlib>
#include <cstdio>

typedef unsigned long long int Num;
typedef char* String;
typedef void* PTR;

struct Clase {
  PTR * metodos;
};

struct Objecto {
  Clase* clase;
  PTR*   varsInstancia;
};

typedef Objecto* (*Metodo)(...);

#define NUM_TO_PTR(N) ((PTR)(N))
#define PTR_TO_NUM(P) ((Num)(P))

#define STRING_TO_PTR(S) ((PTR)(S))
#define PTR_TO_STRING(P) ((String)(P))

#define METHOD_TO_PTR(M) ((PTR)(M))
#define PTR_TO_METHOD(P) ((Metodo)(P))

#define OBJECT_TO_PTR(O) ((PTR)(O))
#define PTR_TO_OBJECT(P) ((Objeto*)(P))\n\n`
  }

  function primitiveConstructor(primitive, id, type, caster){
    return `
/* Construye un objeto de clase ${primitive} */
Objeto* constructor_${id}(${type} valor) {
 Objeto* obj = new Objeto;
 obj->clase = ${id}; /* ${primitive} */
 obj->varsInstancia = new PTR[1];
 obj->varsInstancia[0] = ${caster}(valor);
 return obj;
} `
  }

  function primitivePointer(primitive, id){
    return `Clase* ${id}; /* ${primitive} */`
  }

  function classPointers(clazz, id) {
    return `Clase* ${id}; /* ${clazz} */`
  }

  function classesConstructors(clazz, id, locales, numId){
    let length = locales.length
    return `
/* Construye un objeto de la clase ${clazz} */
Objecto* constructor_${id}(){
  Objecto* obj = new Objecto;
  obj->clase = ${id}; /* ${clazz} */
` + ( 
  length > 0 
    ? `\n  /* Reserva espacio para ${length} variable${length===1 ? '' : 's'} de instancia [${locales.map(x=>x.id).join(',')}]\n  obj->varsInstancia = new PTR[${length}] \n` + locales.map(
        (_, index)=>`  obj->varsInstancia[${index}] = constructor_${numId}(0); /* Se inicializa en 0*/`).join('\n') + '\n'
    : ''
  ) + `\n  return obj;\n}`

  }

  function generateMethodsCode_noCodeVariant(data) {
    return `
/* ${data.classId} => ${data.class}, ${data.methodId} => ${data.selector} */
Objecto* met_${data.classId}_${data.methodId}(` + (new Array(data.params)).fill(0).map((_,i)=>`Objeto* o${i}`).join() + '){\n' +
` /* codeGoesHere */             ` + `
}`      
  }

  function generateMainCode_noMainProgramVariant(classData, allSelectors){

    let methodLine = (methodExists, classId, methodId)  => 
      !! methodExists
        ? `METHOD_TO_PTR(met_${classId}_${methodExists.methodId})`
        : `NULL`
    return 'void main(){\n' + classData.map(({ classId : classId, class : className, methods : methods }) => 
      `  /* Inicialización de la clase ${classId} (${className})  */
    ${classId} = new Clase;
    ${classId}->metodos = mew PTR[${allSelectors.length}];  /* Los selectores son ${allSelectors[0]} ...,${allSelectors[allSelectors.length-1]}*/\n` + 
      allSelectors.map((currentSelector, index) => {
        let currentMethod = methods.find(x => x.selector === currentSelector)
        let line = methodLine(currentMethod, classId)
        let spaces = (new Array(70 - line.length)).fill(' ').join('')
        return `    ${classId}->metodos[${index}] = ${line}${spaces} /* ${currentSelector} */`
    }).join('\n')
    ).join('\n') + '\n}\n'
  }
  
}
const 
  util              = require('util'),
  ArgumentParser    = require('argparse').ArgumentParser,
  RemolachaCompiler = require('./lib/remolacha').compiler
;

const argparse = new ArgumentParser({
  version: '0.1.0',
  addHelp: true,
  description: 'C++ remolacha compiler'
});

argparse.addArgument(  ['-o', '--outputFile'], {
  help         : 'output file name',
  defaultValue : 'output.cpp'
});

argparse.addArgument(  ['-s', '--sourceFile'], {
  help         : 'remolacha source file',
  required     : true
});

argparse.addArgument(  ['-ov', '--onlyValidations'], {
  help         : 'run only validations steps',
  nargs        : 0
});

argparse.addArgument(  ['-ss', '--showSource'], {
  help         : 'show parsed tree',
  nargs        : 0
});

argparse.addArgument(  ['-sc', '--showContext'], {
  help         : 'show context at the end of compilation process',
  nargs        : 0
});



function log(item, depth = 8){
  console.log("-------------------------------------------------------------------------");
  console.log("-------------------------------------------------------------------------");
  console.log('log: ',util.inspect(item, { colors: true, depth: depth }));
  console.log("-------------------------------------------------------------------------");
  console.log("-------------------------------------------------------------------------");
}

function logCheck(check){
  log({ 
    check : ( check 
      ? " No errors found, can proceed to compilation stage " 
      : " Found errors during validation stage, see above ") 
  })
}


(function run(args){
  var remolacha = new RemolachaCompiler(args)

  if (args.showSource) log(remolacha.source)

  let validations = remolacha.runValidations()

  let validationCheck = !(validations.reduce((carry, current) =>  carry || current.error , false))

  if ( !validationCheck || args.onlyValidations ) {
    validations.forEach( v => {
      console.log('log: ',v.step);
      log(v)
    })
    logCheck(validationCheck)
  } else {
    remolacha.compile({ output : args.outputFile, showContext : args.showContext })
  }

})(argparse.parseArgs());
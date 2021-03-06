#!/usr/bin/env node

const {
  FileService,
  ExecService,
  TermApplication,
  ListScriptsCommand,
  RunScriptCommand,
  ConfigService,
  OPTION_PATH_FILE_TOKEN,
  getOptionsFilePath,
  getPackageData,
  MessageService
} = require('../src')

;(() => {
  const cli = TermApplication.createInstance()
  const pkg = getPackageData()

  cli.version = pkg.version
  cli.description = 'Custom scripts manager.'

  cli.register(RunScriptCommand, [ExecService, FileService, MessageService])
  cli.register(ListScriptsCommand, [FileService, MessageService])

  cli.provide({ identity: OPTION_PATH_FILE_TOKEN, useValue: getOptionsFilePath() })
  cli.provide(FileService, [ConfigService, MessageService])
  cli.provide(ExecService)
  cli.provide(ConfigService, [OPTION_PATH_FILE_TOKEN])

  cli.start()
})()

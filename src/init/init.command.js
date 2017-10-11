const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')

const { FsUtils } = require('../shared/fs.utils')
const { LogUtils } = require('../shared/log.utils')
const { GitUtils } = require('../shared/git.utils')

const { InitStopedByUser } = require('./init-stop-by-user.error')
const { FolderNotEmpty } = require('../shared/folder-not-empty.error')
const { FileNotDirectory } = require('../shared/file-not-directory.error')

const URL_REGEX = /^((?:(https?):\/\/)?((?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[0-9][0-9]|[0-9])\.(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[0-9][0-9]|[0-9])\.)(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[0-9][0-9]|[0-9])\.)(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[0-9][0-9]|[0-9]))|(?:(?:(?:\w+\.){1,2}[\w]{2,3})))(?::(\d+))?((?:\/[\w]+)*)(?:\/|(\/[\w]+\.[\w]{3,4})|(\?(?:([\w]+=[\w]+)&)*([\w]+=[\w]+))?|\?(?:(wsdl|wadl))))$/
const PATH_REGEX = /^(?:(?:~|\.{1,2})?\/)+(?:[a-zA-Z\.\-\_]+\/?)*$/

module.exports = exports = configService => options => {
  const userForceOverwrite = options.force || false
  const questions = [
    {
      name: 'overwrite_file',
      message: 'A configuration file already exist. Do you want to continue ?',
      type: 'confirm',
      when: () => configService.configFileExist() && !userForceOverwrite
    },
    {
      name: 'repo_url',
      message: 'Repository url:',
      type: 'input',
      validate: url => URL_REGEX.test(url),
      default: () => {
        if (configService.configFileExist()) {
          return configService.repoUrl
        }
      },
      when: data => !configService.configFileExist() || data.overwrite_file || userForceOverwrite
    },
    {
      name: 'folder_path',
      message: 'Folder path:',
      type: 'input',
      validate: path => PATH_REGEX.test(path),
      default: () => {
        if (configService.configFileExist()) {
          return configService.folderPath
        }
      },
      when: data => !configService.configFileExist() || data.overwrite_file || userForceOverwrite
    }
  ]

  inquirer.prompt(questions)
    .then(({ repo_url = null, folder_path, overwrite_file = true }) => {
      if (!overwrite_file) {
        throw new InitStopedByUser('You stopped the command. Nothing has be made.')
      }

      folder_path = folder_path.replace('~', process.env.HOME)
      folder_path = path.resolve(folder_path)

      configService.repoUrl = repo_url
      configService.folderPath = folder_path
    })
    .then(() => {
      const folderPath  = configService.folderPath
      if (!FsUtils.fileExist(folderPath)) {
        LogUtils.log({ type: 'info', message: 'Folder does not exist. It will be created.' })
        fs.mkdirSync(folderPath)
      }

      const isDirectory = fs.statSync(folderPath).isDirectory()
      if (!isDirectory) {
        throw new FileNotDirectory()
      }

      const folderIsEmpty = fs.readdirSync(folderPath).length < 1
      if (!folderIsEmpty) {
        throw new FolderNotEmpty()
      }
    })
    .then(() => {
      if (configService.repoUrl == null) {
        LogUtils.log({ type: 'warn', message: 'Impossible to cloned git repository. Need repository URL.' })
        return
      }

      return GitUtils.clone(configService.repoUrl, configService.folderPath)
        .then(repo => {
          LogUtils.log({ type: 'info', message: 'Git repository cloned successuly.' })
          return
        })
    })
    .catch(error => {
      if (error instanceof InitStopedByUser) {
        LogUtils.log({ message: error.message })
        return
      }

      if (error instanceof FolderNotEmpty) {
        LogUtils.log({ type: 'error', message: error.message })
        return
      }

      if (error instanceof FileNotDirectory) {
        LogUtils.log({ type: 'error', message: error.message })
        return
      }

      LogUtils.log({ type: 'error', message: 'An error occured.', prefix: ' Fail ' })
    })
}

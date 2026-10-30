@Library('Cumulus@1.3-stable') _

def nodePodSpec = '''
spec:
  containers:
    - name: node
      image: acd-docker.repository.milieuinfo.be/library/node:22-alpine
      command:
        - cat
      tty: true
      env:
        - name: npm_config_cache
          value: /tmp/npm-cache
        - name: NODE_OPTIONS
          value: --max-old-space-size=4096
      volumeMounts:
        - mountPath: /root/.npmrc
          subPath: .npmrc
          name: js-settings
      resources:
        requests:
          memory: "512Mi"
          cpu: "250m"
        limits:
          memory: "6Gi"
  volumes:
    - name: js-settings
      secret:
        secretName: jenkins-secrets
'''

pipeline {

	agent {
		kubernetes {
			inheritFrom 'jenkins-jenkins-agent'
			yaml podBuilder.from([nodePodSpec, trivy.podSpec()])
		}
	}

	options {
		disableConcurrentBuilds()
	}

	stages {

		stage("Setup") {
			steps {
				script {
					if (env.BRANCH_IS_PRIMARY) {
						properties([versions.releaseParameters()])
						def currentVersion = readJSON(file: 'package.json').version
						if (versions.isRelease()) {
							def version = versions.bump(currentVersion)
							git.validateTag("v${version}")
							env.VERSION = version
						}
					} else {
						properties([parameters([
								booleanParam(name: 'DEPLOY', defaultValue: false, description: 'If true, publishes a prerelease to the npm registry after the build.')
						])])
					}
				}
			}
		}

		stage("Build") {
			when {
				expression { git.notSkipCi() }
			}
			parallel {
				stage("Trivy scan") {
					steps {
						script {
							trivy.scanFilesystem([targetPath: 'pnpm-lock.yaml'])
						}
					}
				}
				stage("pnpm build") {
					steps {
						container('node') {
							sh '''
								npm install -g pnpm@9.15.9
								rm -rf build
								pnpm install --frozen-lockfile
								pnpm test
								pnpm exec rollup -c rollup.config.mjs
							'''
						}
					}
				}
			}
		}

		stage("Non-primary branch") {
			when {
				allOf {
					not { expression { env.BRANCH_IS_PRIMARY } }
					expression { git.notSkipCi() }
					expression { params.DEPLOY ?: false }
				}
			}
			stages {
				stage("pnpm publish prerelease") {
					steps {
						container('node') {
							sh '''
								PRERELEASE_ID=$(echo "${BRANCH_NAME}" | tr -c 'a-zA-Z0-9\\n' '-')
								npm version prerelease --preid "${PRERELEASE_ID}.${BUILD_NUMBER}" --no-git-tag-version --ignore-scripts
								npm install -g pnpm@9.15.9
								pnpm publish --tag "${PRERELEASE_ID}" --no-git-checks
							'''
						}
					}
				}
			}
		}

		stage("Primary branch") {
			when {
				allOf {
					expression { env.BRANCH_IS_PRIMARY }
					expression { git.notSkipCi() }
					expression { versions.isRelease() }
				}
			}
			stages {
				stage("npm version") {
					steps {
						container('node') {
							sh 'npm version "${VERSION}" --no-git-tag-version --ignore-scripts'
						}
					}
				}
				stage("pnpm publish") {
					steps {
						container('node') {
							sh '''
								npm install -g pnpm@9.15.9
								pnpm publish --no-git-checks
							'''
						}
					}
				}
				stage("Git tag & push") {
					steps {
						container('jnlp') {
							script {
								git.withGitAuth {
									sh '''
										git config user.email "$GIT_USER_EMAIL"
										git config user.name "$GIT_USER_NAME"
										git add package.json
										git commit -m "${VERSION} [skip ci]"
										git tag "v${VERSION}"
										git push origin "HEAD:${BRANCH_NAME}" "v${VERSION}"
									'''
								}
							}
						}
					}
				}
			}
		}
	}

	post {
		always {
			script {
				pipelineSummary([:])
			}
		}
	}
}

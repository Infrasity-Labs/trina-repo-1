import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The Trina AX release this repo is written and tested against. Change it here only. */
export const TRINA_AX_VERSION = '0.5.9'
export const TRINA_AX_REPO = 'https://github.com/trina-app/trina-ax.git'

/** Own compose project, volume and port, so this demo never touches a real Trina AX install on the same Docker host
 * (the product's compose file defaults to project "trina-ax", volume "trina-ax_data" and port 47820). */
export const COMPOSE_PROJECT = 'pinewharf-trina-ax'
export const DEFAULT_PORT = 47830
export const SERVICE = 'trina-ax'

export const KIT_DIR = path.join(ROOT, '.trina-ax-kit')
export const KIT_DOCKER_DIR = path.join(KIT_DIR, 'docker')
export const STATE_DIR = path.join(ROOT, '.demo')
export const OWNER_PASSWORD_FILE = path.join(STATE_DIR, 'owner-password')
export const COMPANY_DIR = path.join(ROOT, 'company')
export const COMPANY_FILE = path.join(COMPANY_DIR, 'company.json')
export const FILES_DIR = path.join(COMPANY_DIR, 'files')

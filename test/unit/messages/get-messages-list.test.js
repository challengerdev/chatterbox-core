import test from 'ava'
import hat from 'hat'
import GetMessagesList from '../../../src/messages/get-messages-list'

test('should retrieve and parse data from correct path', async t => {
  const repoDir = `/${Date.now()}`
  const peerId = hat()

  const getMessagesPath = peerId => `${repoDir}/${peerId}/messages.json`
  const messagesList = [{
    id: hat(),
    text: hat(),
    receivedAt: Date.now()
  }]

  const ipfs = {
    files: {
      read: path => {
        t.is(path, getMessagesPath(peerId))
        return Buffer.from(JSON.stringify(messagesList))
      }
    }
  }

  const getMessagesList = GetMessagesList({ ipfs, getMessagesPath })

  const list = await getMessagesList(peerId)

  t.deepEqual(list, messagesList)
})

test('should return empty array when messages file does not exist', async t => {
  const repoDir = `/${Date.now()}`
  const peerId = hat()

  const getMessagesPath = peerId => `${repoDir}/${peerId}/messages.json`

  const ipfs = {
    files: {
      read: path => {
        throw Object.assign(new Error('not found'), { code: 'ERR_NOT_FOUND' })
      }
    }
  }

  const getMessagesList = GetMessagesList({ ipfs, getMessagesPath })

  const list = await getMessagesList(peerId)

  t.deepEqual(list, [])
})

test('should throw on read error', async t => {
  const repoDir = `/${Date.now()}`
  const peerId = hat()

  const getMessagesPath = peerId => `${repoDir}/${peerId}/messages.json`

  const ipfs = {
    files: {
      read: path => {
        throw new Error('boom')
      }
    }
  }

  const getMessagesList = GetMessagesList({ ipfs, getMessagesPath })

  const err = await t.throwsAsync(getMessagesList(peerId))

  t.is(err.message, 'boom')
})
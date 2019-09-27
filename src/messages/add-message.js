const { Buffer } = require('buffer')
const hat = require('hat')
const Validate = require('./validate')

module.exports = ({
  ipfs,
  peers,
  friends,
  syndicate,
  getMessagesPath,
  getMessagesList,
  friendsMessageHistorySize
}) => {
  return async (peerId, text) => {
    Validate.peerId(peerId)
    Validate.text(text)

    const messageId = hat()
    const receivedAt = Date.now()
    const message = { id: messageId, text, receivedAt }

    let messages = await getMessagesList(peerId)
    const friendsList = await friends.list()

    if (friendsList.includes(peerId)) {
      messages = messages.concat(message)
    } else {
      const { id } = await ipfs.id()
      if (peerId === id) {
        messages = messages.concat(message)
      } else {
        messages = [message]
      }
    }

    let removedMessages = []

    if (messages.length > friendsMessageHistorySize) {
      removedMessages = messages.slice(0, messages.length - friendsMessageHistorySize)
      messages = messages.slice(0, -friendsMessageHistorySize)
    }

    const data = Buffer.from(JSON.stringify(messages))
    await ipfs.files.write(getMessagesPath(peerId), data, {
      create: true,
      parents: true
    })

    // Caller _should_ have already taken a write lock on the peer
    await peers.__unsafe__.set(peerId, { lastMessage: message, lastSeenAt: receivedAt })

    syndicate.publish({ action: 'add', peerId, messageId, message })

    removedMessages.forEach(m => {
      syndicate.publish({ action: 'remove', peerId, messageId: m.id })
    })
  }
}
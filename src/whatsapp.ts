import * as fs from 'fs';

import {
  WAConnection,
  proto,
  Presence,
  ReconnectMode,
  waChatKey,
  MessageType,
} from '@adiwajshing/baileys';

export default class WhatsApp {
  public conn: WAConnection;
  public totalProcess: number; // total running process, don't close if there are still running processes

  constructor() {
    this.totalProcess = 0;
    this.conn = new WAConnection(); // instantiate
    this.conn.version = [3, 3234, 9];
    this.conn.autoReconnect = ReconnectMode.onConnectionLost; // only automatically reconnect when the connection breaks
    this.conn.logger.level =
      process.env.NODE_ENV !== 'production' ? 'debug' : 'info';
    this.conn.connectOptions.maxRetries = 10;
    this.conn.chatOrderingKey = waChatKey(true); // order chats such that pinned chats are on top
    this.conn.on('chats-received', ({ hasNewChats }) => {
      console.log(
        `you have ${this.conn.chats.length} chats, new chats available: ${hasNewChats}`,
      );
    });
    this.conn.on('contacts-received', () => {
      console.log(
        `you have ${Object.keys(this.conn.contacts).length} contacts`,
      );
    });
    this.conn.on('initial-data-received', () => {
      console.log('received all initial messages');
    });
  }

  connect = async (): Promise<WhatsApp> => {
    fs.existsSync('./auth_info.json') &&
      this.conn.loadAuthInfo('./auth_info.json');
    await this.conn.connect();
    const authInfo = this.conn.base64EncodedAuthInfo();
    fs.writeFileSync('./auth_info.json', JSON.stringify(authInfo, null, '\t'));
    return this;
  };

  close = (): WhatsApp => {
    this.conn.close();
    return this;
  };

  loadMessages = async (
    jid: string,
    count: number,
  ): Promise<proto.WebMessageInfo[]> => {
    const groupMessages = await this.conn.loadMessages(jid, count, null, true);
    return groupMessages.messages;
  };

  reportHealthForm = async (jid: string, name: string): Promise<string> => {
    const messages = await this.loadMessages(jid, 100);
    const formMessage = this._findTodayLatestFormMessage(messages);
    const filledFormMessage = this._fillFormMessage(formMessage, name);

    console.log('sending report to whatsapp');
    await this.conn.chatRead(jid); // mark chat read
    await this.conn.updatePresence(jid, Presence.available); // tell them we're available
    await this.conn.updatePresence(jid, Presence.composing); // tell them we're composing
    const response = await this.conn.sendMessage(
      jid,
      filledFormMessage,
      MessageType.text,
    );
    console.log(
      `sent message with ID "${response.key.id}" to recipient ${jid} successfully`,
    );

    return filledFormMessage;
  };

  _findTodayLatestFormMessage = (messages: proto.WebMessageInfo[]): string => {
    const linkRegex = /https:\/\/bit\.ly\/ASII_2020/;
    const startOfToday = new Date().setUTCHours(-7, 0, 0, 0) / 1000;

    for (let idx = messages.length - 1; idx >= 0; idx--) {
      const { message, messageTimestamp } = messages[idx];

      if (messageTimestamp < startOfToday) {
        continue;
      }

      if (!message) {
        continue;
      }

      const { extendedTextMessage = {}, conversation = '' } = message;

      if (linkRegex.test(extendedTextMessage.text)) {
        return extendedTextMessage.text;
      }

      if (linkRegex.test(conversation)) {
        return conversation;
      }
    }

    return undefined;
  };

  _fillFormMessage = (formText: string, name: string): string => {
    if (formText) {
      const unfilledNameRegex = /[\d]+\.\s*(\n|$)/;
      const match = formText.match(unfilledNameRegex);

      if (!match) {
        throw new Error('No Unfilled Form Found');
      }

      const [word, newline] = match;
      const sliceIdx = match.index + word.length - newline.length;
      return (
        formText.slice(0, sliceIdx) + ' ' + name + formText.slice(sliceIdx)
      );
    }

    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `Tim Data Management ${currentDate}:\n\nhttps://bit.ly/ASII_2020\n\n1. ${name}\n2.\n3.\n4.\n5.\n6.\n7.\n8.\n9. \n10.\n11. \n12. \n13.\n14.`;
  };
}

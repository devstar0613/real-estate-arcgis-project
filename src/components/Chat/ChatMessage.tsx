import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';

import { updateConversation } from '../../utils/app/conversation';

import { Message } from '../../types/chat';

import HomeContext from '../../utils/context/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
// import remarkMath from 'remark-math';

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void
}

export const ChatMessage: FC<Props> = memo(({ message, messageIndex, onEdit }) => {

  const {
    state: { selectedConversation, conversations, currentMessage, messageIsStreaming },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState(message.content);
  const [messagedCopied, setMessageCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleEditMessage = () => {
    if (message.content != messageContent) {
      if (selectedConversation && onEdit) {
        onEdit({ ...message, content: messageContent });
      }
    }
    setIsEditing(false);
  };

  const handleDeleteMessage = () => {
    if (!selectedConversation) return;

    const { messages } = selectedConversation;
    const findIndex = messages.findIndex((elm) => elm === message);

    if (findIndex < 0) return;

    if (
      findIndex < messages.length - 1 &&
      messages[findIndex + 1].role === 'assistant'
    ) {
      messages.splice(findIndex, 2);
    } else {
      messages.splice(findIndex, 1);
    }
    const updatedConversation = {
      ...selectedConversation,
      messages,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );
    homeDispatch({ field: 'selectedConversation', value: single });
    homeDispatch({ field: 'conversations', value: all });
  };

  const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
      e.preventDefault();
      handleEditMessage();
    }
  };

  const copyOnClick = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setMessageCopied(true);
      setTimeout(() => {
        setMessageCopied(false);
      }, 2000);
    });
  };

  useEffect(() => {
    setMessageContent(message.content);
  }, [message.content]);


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  return (
    <div
      className={`group md:px-4 ${
        message.role === 'assistant'
          // ? 'bg-light-green dark:bg-light-green'
          // : 'bg-light-green dark:bg-light-green'
      }`}
      style={{ overflowWrap: 'anywhere' }}
    >
      <div className="relative flex p-2 m-auto text-base md:max-w-2xl lg:max-w-2xl lg:px-0 xl:max-w-3xl" style={{paddingRight:'10px',gap: '1rem'}}>
        <div className="min-w-[40px] text-right font-bold">
          {message.role === 'assistant' ? (
            <img 
  src="https://www.dropbox.com/scl/fi/yh2sb21oqn3bj5f5t4teu/Screenshot_2023-11-11_at_7.47.34_PM-removebg-preview.png?rlkey=10djlurjsew8s9e11qfh8f2ft&raw=1" 
  alt="Robot Icon" 
  style={{ width: 30, height: 30 }} // Set the size of the image
/>
          ) : (
            <IconUser size={30} />
          )}
        </div>

        <div className="w-full prose dark:prose-invert">
          {message.role === 'user' ? (
            <div className="flex w-full" style={{paddingRight:'15px'}}>
              {isEditing ? (
                <div className="flex flex-col w-full">
                  <textarea
                    ref={textareaRef}
                    className="w-full whitespace-pre-wrap border-none resize-none bg-light-green dark:bg-light-green text-light-whit disabled:opacity-50"
                    value={messageContent}
                    onChange={handleInputChange}
                    onKeyDown={handlePressEnter}
                    onCompositionStart={() => setIsTyping(true)}
                    onCompositionEnd={() => setIsTyping(false)}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                      padding: ' 3px 0 3px 8px',
                      margin: '0',
                      overflow: 'hidden',
                      background: '#08241c'
                    }}
                  />

                  <div className="flex justify-center mt-10 space-x-4">
                    <button
                      className="h-[40px] rounded-md px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50"
                      style={{background: '#08241c'}}
                      onClick={handleEditMessage}
                      disabled={messageContent.trim().length <= 0}
                    >
                      Save & Submit
                    </button>
                    <button
                      className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      style={{background: '#626963'}}
                      onClick={() => {
                        setMessageContent(message.content);
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 prose whitespace-pre-wrap dark:prose-invert">
                  {message.content}
                </div>
              )}

              {!isEditing && (
                <div className="flex flex-col items-center justify-end gap-4 ml-1 md:-mr-8 md:ml-0 md:flex-row md:gap-1 md:items-start md:justify-start">
                  <button
                    className="invisible text-gray-500 group-hover:visible focus:visible hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={toggleEditing}
                  >
                    <IconEdit size={20} />
                  </button>
                  <button
                    className="invisible text-gray-500 group-hover:visible focus:visible hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={handleDeleteMessage}
                  >
                    <IconTrash size={20} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-row"style={{paddingRight:'15px'}}>
              <MemoizedReactMarkdown
                className="flex-1 prose dark:prose-invert"
                remarkPlugins={[remarkGfm]}
                // remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeMathjax]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    if (children.length) {
                      if (children[0] == '▍') {
                        return <span className="mt-1 cursor-default animate-pulse">▍</span>
                      }

                      children[0] = (children[0] as string).replace("`▍`", "▍")
                    }

                    const match = /language-(\w+)/.exec(className || '');

                    return !inline ? (
                      <CodeBlock
                        key={Math.random()}
                        language={(match && match[1]) || ''}
                        value={String(children).replace(/\n$/, '')}
                        {...props}
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children }) {
                    return (
                      <table className="px-3 py-1 border border-collapse border-black dark:border-white">
                        {children}
                      </table>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="px-3 py-1 text-white break-words bg-gray-500 border border-black dark:border-white">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="px-3 py-1 break-words border border-black dark:border-white">
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {`${message.content}${
                  messageIsStreaming && messageIndex == (selectedConversation?.messages.length ?? 0) - 1 ? '`▍`' : ''
                }`}
              </MemoizedReactMarkdown>

              <div className="flex flex-col items-center justify-end gap-4 ml-1 md:-mr-8 md:ml-0 md:flex-row md:gap-1 md:items-start md:justify-start">
                {messagedCopied ? (
                  <IconCheck
                    size={20}
                    className="text-green-500 dark:text-green-400"
                  />
                ) : (
                  <button
                    className="invisible text-gray-500 group-hover:visible focus:visible hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={copyOnClick}
                  >
                    <IconCopy size={20} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';

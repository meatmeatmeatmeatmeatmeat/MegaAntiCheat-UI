import React, { useEffect } from 'react';
import './Player.css';

import { t } from '@i18n';
import { updatePlayer } from '@api/players';
import { ContextMenu, Select, Tooltip } from '@components/General';
import { ContextMenuContext } from '@context';
import {
  buildIconList,
  displayColor,
  displayNamesList,
  displayProperStatus,
  formatTimeToString,
  localizeVerdict,
  makeLocalizedVerdictOptions,
} from './playerutils';
import PlayerDetails from './PlayerDetails';

import { verifyImageExists } from '@api/utils';
import { kickPlayer } from '@api/commands';
import { Info } from 'lucide-react';
import { useModal } from '@context';
import ChangeAliasModal from './Modals/ChangeAliasModal';
import { readFromMcd } from '@components/TF2/Player/mcd_reader';
import { nodes } from '@components/TF2/Player/mcdb';
import JSON5 from 'json5';
import { MenuItem } from '../../../Context/ContextMenuProvider';

interface PlayerProps {
  player: PlayerInfo;
  icon?: string;
  className?: string;
  onImageLoad?: () => void;
  playerColors?: Record<string, string>;
  openInApp?: boolean;
  userSteamID?: string;
  cheatersInLobby: PlayerInfo[];
}

const Player = ({
  player,
  className,
  onImageLoad,
  playerColors,
  openInApp,
  cheatersInLobby,
}: PlayerProps) => {
  const isFirstRefresh = React.useRef(true);
  // Context Menu
  const { showMenu } = React.useContext(ContextMenuContext);

  // Modal
  const { openModal } = useModal();

  // States
  const [playtime, setPlaytime] = React.useState(0);
  const [pfp, setPfp] = React.useState<string>('./person.webp');
  const [showPlayerDetails, setShowPlayerDetails] = React.useState(false);
  // TODO make mcd a global state
  const [mcd, setMcd] = React.useState(nodes);
  useEffect(() => {
    // console.log('mcd updated');
  }, [mcd]);
  useEffect(() => {
    // Update mcd
    const fetchData = async () => {
      const proxyUrl = 'https://corsproxy.io/?';
      const targetUrl = 'https://megascatterbomb.com/mcd';

      const fetchHTML = async (url: string): Promise<string> => {
        try {
          const response = await fetch(proxyUrl + url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.text();
        } catch (error) {
          console.error('Error:', error);
          throw error;
        }
      };

      const processHTML = async (htmlString: string) => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlString, 'text/html');

          const scriptTags = doc.getElementsByTagName('script');

          for (let i = 0; i < scriptTags.length; i++) {
            // console.log(scriptTags[i].textContent);
            const id = 'var nodes = new vis.DataSet(';
            if (scriptTags[i].textContent?.includes(id)) {
              const nodesBefore = scriptTags[i].textContent?.split(id)[1];
              if (nodesBefore) {
                const nodesAfter = nodesBefore?.split(']);')[0];
                if (nodesAfter) {
                  const parser = nodesAfter + ']';
                  const array = JSON5.parse(parser);
                  setMcd(array);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error:', error);
          throw error;
        }
      };

      const processURL = async (url: string) => {
        try {
          const html = await fetchHTML(url);
          await processHTML(html);
        } catch (error) {
          console.error('Error:', error);
        }
      };

      await processURL(targetUrl);
    };

    // Fetch data immediately
    fetchData();

    // Then fetch data every 20 minutes
    const intervalId = setInterval(fetchData, 20 * 60 * 1000); // 20 minutes in milliseconds

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const urlToOpen = openInApp
    ? `steam://url/SteamIDPage/${player.steamID64}`
    : player.steamInfo?.profileUrl;

  player = readFromMcd(player, mcd);

  // Use "Player" as a verdict if the client isnt You
  const displayVerdict = player.isSelf
    ? t('YOU')
    : localizeVerdict(player.localVerdict);
  const displayTime = formatTimeToString(playtime);
  const displayStatus = displayProperStatus(player.gameInfo!.state!);
  const displayName = player.customData?.alias || player.name;

  // const color = displayColor(playerColors!, player, cheatersInLobby);

  const [color, setColor] = React.useState<string | undefined>(
    displayColor(playerColors!, player, cheatersInLobby),
  );

  React.useEffect(() => {
    setColor(displayColor(playerColors!, player, cheatersInLobby));
  }, [player.localVerdict, playerColors, player, cheatersInLobby]);

  const localizedLocalVerdictOptions = makeLocalizedVerdictOptions();

  const disconnected = displayStatus === 'Disconnected';

  // Prevent text selection on click (e.g Dropdown)
  React.useEffect(() => {
    function preventDefault(e: MouseEvent) {
      if (e.detail != 2) return;

      e.preventDefault();
    }

    document.addEventListener('mousedown', preventDefault);

    return () => document.removeEventListener('mousedown', preventDefault);
  }, []);

  // Sync time if not yet set or out of sync (e.g. switched servers)
  React.useEffect(() => {
    if (
      !isFirstRefresh.current &&
      Math.abs(playtime - (player.gameInfo?.time ?? playtime)) <= 3
    ) {
      return;
    }

    setPlaytime(player.gameInfo?.time ?? 0);
    isFirstRefresh.current = false;
  }, [player.gameInfo?.time]);

  // Update playtime every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (disconnected) return;
      setPlaytime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [disconnected]);

  // Update pfp on mount
  React.useEffect(() => {
    if (!player.steamInfo?.pfp) return;

    verifyImageExists(player.steamInfo?.pfp, './person.webp').then((src) => {
      setPfp(src);

      if (onImageLoad) onImageLoad();
    });
  }, [player.steamInfo?.pfp]);

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const menuItems: MenuItem[] = [
      {
        label: 'Open Profile',
        onClick: () => {
          parent.open(urlToOpen, '_blank');
        },
      },
      {
        label: 'Copy...',
        multiOptions: [
          {
            label: 'Name',
            onClick: () => navigator.clipboard.writeText(player.name),
          },
          {
            label: 'SteamID64',
            onClick: () => navigator.clipboard.writeText(player.steamID64),
          },
        ],
      },
      {
        label: 'Change Alias',
        onClick: () =>
          openModal(<ChangeAliasModal player={player} />, {
            dismissable: true,
          }),
      },
    ];

    if (!disconnected) {
      menuItems.push({
        label: 'Votekick Player',
        multiOptions: [
          {
            label: 'Cheating',
            onClick: () => kickPlayer(player.gameInfo.userid, 'cheating'),
          },
          {
            label: 'Scamming',
            onClick: () => kickPlayer(player.gameInfo.userid, 'scamming'),
          },
          {
            label: 'Idle',
            onClick: () => kickPlayer(player.gameInfo.userid, 'idle'),
          },
          {
            label: 'No Reason',
            onClick: () => kickPlayer(player.gameInfo.userid, 'none'),
          },
        ],
      });
    }

    showMenu(event, menuItems);
  };

  return (
    <>
      <div
        className={`player-item items-center py-0.5 px-1 grid grid-cols-playersm xs:grid-cols-player hover:bg-highlight/5 ${
          showPlayerDetails ? 'expanded' : ''
        } ${className}`}
        id={`player-display-div-${player.steamID64}`}
        style={{
          backgroundColor: color,
        }}
      >
        <Select
          className="player-verdict"
          options={localizedLocalVerdictOptions}
          placeholder={displayVerdict}
          disabled={player.isSelf}
          onChange={(e) => {
            // Immediately update local instance
            // Causes new info to immediately show
            player.localVerdict = e.toString();
            updatePlayer(player.steamID64, e.toString());
            setColor(displayColor(playerColors!, player, cheatersInLobby));
          }}
        />
        <div onClick={() => setShowPlayerDetails(!showPlayerDetails)}>
          <div
            className="flex ml-1 cursor-pointer select-none"
            key={player.steamID64}
            onContextMenu={handleContextMenu}
          >
            <img
              className="rounded-s-sm mx-3 cursor-pointer"
              width={24}
              height={24}
              src={pfp}
              alt="Profile"
              onLoad={onImageLoad}
              style={{ filter: disconnected ? 'grayscale(100%)' : 'inherit' }}
            />
            <div
              className={`text-ellipsis overflow-hidden whitespace-nowrap select-none ${
                disconnected ? 'greyscale' : ''
              }`}
            >
              {displayName}
            </div>
            {(player.previousNames?.filter((v) => v != player.customData?.alias)
              .length ?? 0) >= 1 && (
              <Tooltip
                className="ml-1 bottom-[1px]"
                content={displayNamesList(player)}
              >
                <Info color="grey" width={16} height={16} />
              </Tooltip>
            )}
          </div>
        </div>
        <div
          className={`flex flex-wrap justify-center bottom-[1px] relative ml-1 ${
            disconnected ? 'greyscale' : ''
          }`}
        >
          {buildIconList(player, cheatersInLobby)}
        </div>
        {/* <div
          className={`player-status hidden xs:[display:unset]  text-ellipsis overflow-hidden whitespace-nowrap ${
            disconnected ? 'greyscale' : ''
          }`}
        >
          {displayStatus}
        </div> */}
        <div
          className={`player-time hidden xs:[display:unset]  text-ellipsis overflow-hidden whitespace-nowrap ${
            disconnected ? 'greyscale' : ''
          }`}
        >
          {displayTime}
        </div>
        <ContextMenu />
      </div>
      <div>
        {showPlayerDetails && (
          <>
            <div className="bg-highlight/40 h-[1px]" />
            <PlayerDetails player={player} bgColor={color} />
          </>
        )}
      </div>
    </>
  );
};

export default Player;

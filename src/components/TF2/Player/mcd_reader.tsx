export interface McdPlayerNode {
  id: string;
  id3?: string;
  id1?: string;
  label?: string;
  borderWidthSelected?: number;
  shape?: string;
  size?: number;
  color: {
    border: string;
    background: string;
    highlight: {
      border: string;
      background: string;
    };
  };
  x: number;
  y: number;
  aliases: string[];
}

export function readFromMcd(
  player: PlayerInfo,
  mcd: McdPlayerNode[],
): PlayerInfo {
  const mcdPLayer = mcd.find((p) => p.id === player.steamID64.toString());
  // const mcdPLayer = limitedSet.find((p) => p.id === player.steamID64);
  if (mcdPLayer) {
    // console.log(`player found ${mcdPLayer.id} ${mcdPLayer.label}`);
    // player.localVerdict = mcdPLayer.label;
    // console.log(mcdPLayer.color.border);
    //cheater ff3300
    console.log(mcdPLayer.color.border);
    switch (mcdPLayer.color.border) {
      case '#ff3300':
        player.localVerdict = 'Cheater';
        break;
      case '#ffff00':
        player.localVerdict = 'Suspicious';
        break;
      case '#33ff00':
        player.localVerdict = 'Trusted';
        break;
      case '#ffffff':
        player.localVerdict = 'Suspicious';
        break;
      default:
        // player.localVerdict = 'Unknown';
        break;
    }
    //    colors: {
    //       You: 'none',
    //       Player: 'none',
    //       Trusted: 'none',
    //       Suspicious: 'none',
    //       Cheater: 'none',
    //       Bot: 'none',
    //     },
    console.log(
      player.localVerdict + ` detected - ${mcdPLayer.id} ${mcdPLayer.label}`,
    );
  } else {
    // console.log('player not found');
  }
  return player;
}

# MegaAntiCheat-UI (WIP)

This is the React UI for MegaAntiCheat (MAC) intended to be used with the [client backend](https://github.com/MegaAntiCheat/client-backend)

## Running

```txt
1. Head to the `Actions` tab
2. Navigate to the `Build and Zip` workflow
3. Click the top-most workflow run
4. Download the latest Artifact
5. Unzip the dist.zip and open the index.html file
```

 OR

Clone this repository and run the following commands in the projects root folder

```sh
pnpm i
pnpm run dev
```
TODO show recent VAC bans in a different color (red for less than 30 days, yellow for less than 365 days)
TODO show amount of cheater/watched/sus friends under kills + deaths in panel

## Tech-stack

### Programming Languages

- Typescript

### Framework

- React

### Bundler

- Webpack

### Frontend styling

- TailwindCSS
- CSS

# Music Theory UI

A React front-end for analyzing Roman numeral chords, inversions, and figured bass in any key. Built with [Vite](https://vite.dev/) and [gRPC-Web](https://github.com/nicholasgasior/gRPC-Web).

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [protoc](https://grpc.io/docs/protoc-installation/) and [protoc-gen-grpc-web](https://github.com/nicholasgasior/gRPC-Web/releases) for code generation

## Getting Started

Install dependencies:

```sh
npm install
```

Start the development server on [http://localhost:3000](http://localhost:3000):

```sh
npm run dev
```

Protobuf client code is regenerated automatically before `dev` and `build` via the `generate.sh` script.

## Available Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                    |
| `npm start`         | Alias for `npm run dev`                      |
| `npm run build`     | Type-check with `tsc` and build for production |
| `npm run preview`   | Preview the production build locally         |
| `npm run generate`  | Regenerate gRPC-Web protobuf client code     |

## Project Structure

```
music-theory-ui/
├── public/              # Static assets (favicon, icons, manifest)
├── src/
│   ├── components/      # React components
│   ├── gen/             # Generated gRPC-Web client code (do not edit)
│   ├── client.ts        # gRPC client setup
│   ├── App.tsx          # Root component
│   ├── index.tsx        # Entry point
│   └── *.css            # Styles
├── index.html           # Vite HTML entry point
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── generate.sh          # Protobuf code generation script
```

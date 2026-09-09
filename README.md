# VS Code QoL Toolkit

A collection of lightweight Visual Studio Code extensions designed to reduce repetitive actions and improve day-to-day productivity.

The goal of this project is not to add new capabilities to VS Code, but to make existing workflows faster and more comfortable by automating common micro-tasks.

The repository currently contains:

- **Python QoL Toolkit**
  - Python-oriented editing shortcuts and code manipulation tools.
- **Jupyter QoL Toolkit**
  - Quality-of-life improvements for Jupyter Notebook users.

Additional toolkits may be added in the future.

---

## Motivation

While working on Python projects and large Jupyter notebooks, I often found myself repeating the same actions dozens of times per day:

- Selecting entire function bodies
- Copying function signatures
- Navigating between functions
- Creating temporary debug prints
- Wrapping code in timing measurements
- Monitoring long-running notebook cells
- Navigating large notebooks with many sections

The purpose of these extensions is to reduce that friction and make common workflows more efficient.

---

## Repository Structure

```text
.
├── install.sh
├── vsc-jupyter-qol-toolkit
└── vsc-python-qol-toolkit
```

Each toolkit is developed as an independent VS Code extension and can be installed separately.

---

# Python QoL Toolkit

Location:

```text
vsc-python-qol-toolkit/
```

A collection of Python-specific editing and navigation commands.

Current features include:

- Select function body
- Copy function body
- Cut function body
- Copy function signature
- Select text inside brackets/parentheses
- Navigate between functions
- Insert debug-print statements
- Wrap code blocks with timing instrumentation

Designed primarily for Python developers who spend a significant amount of time editing source code.

See:

```text
vsc-python-qol-toolkit/README.md
```

for detailed documentation.

---

# Jupyter QoL Toolkit

Location:

```text
vsc-jupyter-qol-toolkit/
```

A toolkit focused on improving the Jupyter Notebook experience inside VS Code.

Current features include:

- Notification when a notebook cell finishes executing
- Sound alerts for long-running computations
- Notebook table-of-contents utilities
- Navigation helpers

Especially useful when working with large notebooks, machine learning experiments, long-running data processing pipelines, or exploratory analysis.

See:

```text
vsc-jupyter-qol-toolkit/README.md
```

for detailed documentation.

---

## Installation

### Install all extensions

From the repository root:

```bash
chmod +x install.sh
./install.sh
```

The installation script compiles and installs all toolkits available in the repository.

---

### Manual Installation

Each extension can also be installed independently.

Example:

```bash
cd vsc-python-qol-toolkit

npm install
npm run compile

npx @vscode/vsce package

code --install-extension *.vsix
```

---

## Development

Requirements:

- Visual Studio Code
- Node.js
- npm
- TypeScript

Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

Install dependencies and bu*ld the desired toolkit:

```bash
cd vsc-python-qol-toolkit

npm install
npm run compile
```

Launch an Extension Development Host from VS Code (`F5`) to test changes.

---

## Roadmap

Possible future additions:

### Other Toolkits

Potential future modules may target:

- LaTeX/Markdown editing
- General VS Code productivity enhancements

---

## License

This repository is provided as-is for personal use and reference.
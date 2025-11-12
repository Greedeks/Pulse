<div align="center">
  
<a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.herokuapp.com?font=Audiowide&size=60&duration=1000&pause=5000&center=true&vCenter=true&width=250&height=90&lines=Pulse" alt="Typing SVG" /></a> 

<img src="https://github.com/Greedeks/Pulse/blob/main/.github/preview.png"/><br/>

</div>

<div align="center">
  
<h3>Responsive web app for GitHub release download statistics</h3>
Works seamlessly on desktop, tablet, and mobile.
</div>

## Features

### Download Statistics 📊

<table>
  <tr>
    <td>

**Metrics**
- **Total Downloads** – total number of downloads across all releases  
- **Total Reactions** – total number of reactions across all releases  
- **Assets** – total number of assets across all releases  
- **Releases** – total number of releases  
- **Releases with reactions** – number of releases that received at least one reaction



    </td>
    <td>
      <img src="https://github.com/Greedeks/Pulse/blob/main/.github/total.png" alt="Download statistics"/>
    </td>
  </tr>
</table>


### Release Cards 🗂️

<table>
  <tr>
    <td>

**Release Metadata**
- Author avatar and author name – links to GitHub profile  
- Tag – links to the corresponding release  
- Label – *Release*, *Latest release* or *Pre-release*  
- Published date, updated date, release size
- Contributor avatars – links to their GitHub profiles

**Assets**
- Only releases containing assets are displayed  
- All assets for each release are listed  
- Each asset is downloadable with a single click  

**Reactions**
- Displays GitHub reactions: 👍 👎 🎉 ❤️ 🚀 👀  
- Total reaction count shown in the header  
- Reactions section appears only if present  

    </td>
    <td>
      <img src="https://github.com/Greedeks/Pulse/blob/main/.github/card.png" alt="Release cards"/>
    </td>
  </tr>
</table>

<br/>

### Sharable links 🔗
- Generate links with pre-filled parameters for easy sharing:  
  - View all releases:  
    ```text
    https://greedeks.github.io/Pulse/?username={username}&repo={repository}
    ```
  - View a specific release by tag:  
    ```text
    https://greedeks.github.io/Pulse/?username={username}&repo={repository}&tag={tag}
    ```
    > You can also use `tag=latest` to always show the latest release.  

<br/>

### Smart parsing

- Instead of filling fields manually, you can also **paste GitHub links**, and they will be automatically parsed into `username`, `repository`, `tag`.
  
  **Examples of supported formats:**  
  - `username/repo`  
  - `github.com/username/repo`  
  - `https://github.com/username/repo`  
  - `username/repo@v1.2.0`  
  - `username/repo/releases/tag/1.2.1`  
  - `https://github.com/username/repo/releases/tag/v1.2.3`  
  - `https://zh.github.com/username/repo`  
  - `https://zh.github.com/username/repo/releases/tag/v2.0.0`  

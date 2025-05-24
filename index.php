<!DOCTYPE html>
<html>
    <!-- HEAD -->
    <?php include 'php/head.php'; ?>    
    <body>
        <!-- NAVIGATION BAR -->
        <?php include 'php/navibar.php'; ?> 
        <div class="box-promo">
            <img src="res\images\promos\promo_banner.jpg">
            <div class="box-promo-textarea">
                <h1>Matthew Vale</h1>
                <h2>Game Developer</h2>
            </div>
        </div>
        <!-- MAIN CONTENT -->
        <div class="page-content-container"> 
            <div class="centered-text">
                <img class="profile-picture" src="res\images\me\me_circle_gradient.png" alt="you found me!">    
                <p>Hi, Matt here. I've been making games using Unity for over 16 years. 
                Check out my personal games <a href="personal-games.php">here</a>
                and my professional work <a href="professional-games.php">here</a>.</p>
                <p>My every day tech stack:</p>
                <div class="tech-stack">
                    <img src="res\images\branding\unity_logo.png" alt="Unity Engine">
                    <img src="res\images\branding\csharp_logo.png" alt="C#">
                    <img src="res\images\branding\visual_studio_community_logo.png" alt="Visual Studio Community">
                    <!-- <img src="res\images\branding\visual_studio_code_logo.png" alt="Visual Studio Code"> -->
                    <img src="res\images\branding\github-mark-white.png" alt="Git">
                    <img src="res\images\branding\blender_logo.png" alt="Blender">
                    <img src="res\images\branding\inkscape_logo.png" alt="Inkscape">
                    <img src="res\images\branding\miro_logo.png" alt="Miro">
                </div>
                <p>View my <a href="https://matthewvaleblog.wordpress.com/">Blog</a>, where I post about my work and thoughts.</p>
                <p>View my <a href="https://github.com/matthewvale">GitHub</a>, which speaks for itself.</p>
                <p>View my <a href="https://miro.com/app/board/uXjVKO9t2B8=/?share_link_id=118558371974">Miro board</a>, where I handle my current project.</p>
            </div>            
            <div class="homepage-game-collection">
                <!-- <div class="homepage-game-promo">
                    <img src="res\images\promos\polyskies_promo.jpg" alt="Poly Skies">
                </div> -->
                <div class="homepage-game">
                    <img src="res\images\personal\polyskies.png" alt="Poly Skies">
                    <img src="res\images\personal\laservasion.jpg" alt="Laservasion">
                </div>
                <div class="homepage-game">
                    <img src="res\images\personal\anwk.jpg" alt="A New World: Kingdoms">    
                    <img src="res\images\personal\polytowns.jpg" alt="Poly Towns">
                </div>
            </div>
            <div class="skills-container">
                <div class="testimonial-item">
                    <div class="skill-title">
                        <h3>LANGUAGES</h3>
                    </div>
                    <div class="skill-row">     
                        <p>C#</p>
                        <p>Java</p>
                        <p>Python</p>
                        <p>HTML + CSS + PHP</p>
                    </div>  
                </div>
                <div class="testimonial-item">
                    <div class="skill-title">
                        <h3>SOFTWARE</h3>
                    </div>
                    <div class="skill-row">     
                        <p>Unity (since 2.6!)</p>
                        <p>Visual Studio / Rider</p>
                        <p>Blender</p>
                        <p>Inkscape</p>
                    </div>  
                </div>
                <div class="testimonial-item">
                    <div class="skill-title">
                        <h3>TECHNICAL SKILLS</h3>
                    </div>
                    <div class="skill-row">
                        <p>Core gameplay systems</p>
                        <p>Memory and code optimization</p>
                        <p>Level Design</p>
                        <p>UI and UX flows</p>
                    </div>   
                </div>
                <div class="testimonial-item">
                    <div class="skill-title">
                        <h3>PLANNING TOOLS</h3>
                    </div>
                    <div class="skill-row">     
                        <p>Confluence</p>
                        <p>Jira</p>
                        <p>Miro</p>
                        <p>Notion</p>
                    </div> 
                </div>
            </div>
        </div>
    </body>
    <!-- FOOTER -->
    <?php include 'php/footer.php'; ?>
</html>
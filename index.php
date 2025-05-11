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
                <br></br>
                <p>View my <a href="https://matthewvaleblog.wordpress.com/">Blog</a>, where I cover more technical aspects of my work.</p>
                <p>View my <a href="https://github.com/MattVale1">GitHub</a>, which contains my own codebase for all my Unity projects.</p>
                <p>View my <a href="https://miro.com/app/board/uXjVKO9t2B8=/?share_link_id=118558371974">Miro board</a>, where I planned my space game project.</p>
            </div>

            <div class="homepage-game-collection">
                <div class="homepage-game-promo">
                    <img src="res\images\promos\polyskies_promo.jpg" alt="Poly Skies">    
                </div>
                <div class="homepage-game">
                    <img src="res\images\personal\laservasion.jpg" alt="Laservasion">      
                    <img src="res\images\personal\nightmaretrails.jpg" alt="Nightmare Trails">      
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
                        <p>HTML + CSS</p>
                    </div>  
                </div>
                <div class="testimonial-item">
                    <div class="skill-title">
                        <h3>TOOLS</h3>
                    </div>
                    <div class="skill-row">     
                        <p>Unity (since 2.6!)</p>
                        <p>Visual Studio + Rider</p>
                        <p>Blender</p>
                        <p>Inkscape</p>
                    </div>  
                </div>
                <div class="testimonial-item">
                    <div class="skill-title">
                        <h3>TECHNICAL SKILLS</h3>
                    </div>
                    <div class="skill-row">
                        <p>Client programming</p>
                        <p>Project optimization</p>
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
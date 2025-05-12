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
                <h1>Professional Games</h1>
                <h2>A list of games I've worked on professionally</h2>
            </div>      
        </div>
        <!-- MAIN CONTENT -->
        <div class="page-content-container">
            <div class="game-collection">                
                <div class="game">
                    <img src="res\images\professional\stuffed.jpg" alt="STUFFED">      
                    <div class="game-details-container">
                        <div class="game-title">
                            <gametitle>STUFFED</gametitle>
                            <releasedate>A game by Waving Bear Studio</releasedate>
                        </div>
                        <p>STUFFED is a first-person shooter where you play as a teddy bear, defending your owner from nightmares. I worked on realtime multiplayer features using PUN2, investigated and resolved various performance problems and fixed critical bugs reported by the players.</p>
                        <div class="game-store-links">
                            <a class="button-style-steam" href="https://store.steampowered.com/app/1243200/STUFFED/" target="_blank">STEAM</a>      
                        </div>
                    </div>
                </div>                                
            </div>
        </div>
    </body>
    <!-- FOOTER -->
    <?php include 'php/footer.php'; ?>
</html>
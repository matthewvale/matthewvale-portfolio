<!DOCTYPE html>
<html>
    <!-- HEAD -->
    <?php include 'php/head.php'; ?>
    <body>
        <!-- NAVIGATION BAR -->
        <?php include 'php/navibar.php'; ?> 
        <div class="box-promo">
            <img src="res\images\promos\anwk_promo.jpg" alt="A New World: Kingdoms">
            <div class="box-promo-textarea">
                <h2>MATTHEW VALE</h2>
                <h3>GAME DEVELOPER</h3>
            </div>
        </div>
        <!-- MAIN CONTENT -->
        <div class="page-content-container">
            <h1>LET'S TALK</h1>
        </div>
        
        <div class="contact-form-container">
            <form action="mailto:matt.vale1@gmail.com" method="POST">
                <label for="fname">Your Name</label>
                <input type="text" id="fname" name="firstname" placeholder="Your name...">
                <label for="subject">Your Subject</label>
                <input type="text" id="subject" name="subject" placeholder="Subject...">
                <label for="subject">Your message...</label>
                <textarea id="subject" name="subject" placeholder="Write your message here..." style="height:200px"></textarea>
                <input type="submit" value="SUBMIT">
            </form>
        </div>
    </body>
</html>
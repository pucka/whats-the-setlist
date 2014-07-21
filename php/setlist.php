<?php
    //This is a proxy for using setlist API with JSONP
    $mbid = $_GET['mbid'];
    $stub = 'http://api.setlist.fm/rest/0.1/artist/';

    if ($mbid) {
        $url = $stub . $mbid . '/setlists.json';
        header('Content-Type: application/json;');

        $ch = curl_init($url);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER  ,1);  // RETURN THE CONTENTS OF THE CALL
        $Rec_Data = curl_exec($ch);
        curl_close($ch);

        echo ($Rec_Data);
    }

?>

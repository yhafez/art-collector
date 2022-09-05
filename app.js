/*-----------------------------------------------------------------------------Global Variables-----------------------------------------------------------------------------*/


const BASE_URL = 'https://api.harvardartmuseums.org';
const KEY = 'apikey=647ac980-794e-11ea-bfc0-679e9f75a4c7'; // USE YOUR KEY HERE


/*---------------------------------------------------------------------------------Functions---------------------------------------------------------------------------------*/


// Fetches all objects which we will use from the API
async function fetchObjects() {
    const url = `${ BASE_URL }/object?${ KEY }`;
    onFetchStart();

    try {
      const response = await fetch(url);
      const data = await response.json();
  
      return data; 

    }
    catch (err) {
      console.error("Oh no! You've encountered an error fetching objects! Error: ", err);
    }
    finally {
      onFetchEnd();
    }
}


//Fetches all centuries used to tag the objects in the collections
async function fetchAllCenturies() {
  const url = `${ BASE_URL }/century?${ KEY }&size=100&sort=temporalorder`;
  onFetchStart();

  if (localStorage.getItem('centuries')) {
    return JSON.parse(localStorage.getItem('centuries'));
  }

  try {
    const response = await fetch(url);
    const { records } = await response.json();
    records.shift() //remove "(not assigned)
    records.shift(); //remove "Unidentified century"
    localStorage.setItem('centuries', JSON.stringify(records));

    return records;
  }
  catch (err) {
    console.error("Oh no! You've encountered an error fetching centuries! Error: ", err);
  }
  finally {
    onFetchEnd();
  }

}


//Fetches all classifications used to tag the objects in the collection
async function fetchAllClassifications () {

  const url = `${ BASE_URL }/classification?${ KEY }&size=100&sort=name`;  

  if (localStorage.getItem('classifications')) {
    return JSON.parse(localStorage.getItem('classifications'));
  }

  onFetchStart();

  try {
    const response = await fetch(url);
    const { records } = await response.json();
    records.shift(); //remove "(not assigned)"
    records.splice(53, 1); //remove "Unidentified"
    localStorage.setItem('classifications', JSON.stringify(records));

    return records;
  }
  catch (err) {
    console.error("Oh no! You've encountered an error fetching classifications! Error: ", err);
  }
  finally {
    onFetchEnd();
  }

}


//Fetches centuries and classifications and populates them into drop-down menus as search parameters
async function prefetchCategoryLists() {

  try {
    [
      classifications, centuries
    ] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies()
    ])

    $('.classification-count').text(`(${ classifications.length })`);

    classifications.forEach(classification => {
  
      const classificationItem = $(`<option value=${classification.name}>${classification.name}</option>`)
  
      $('#select-classification').append(classificationItem);
  
    });
  
    $('.century-count').text(`(${ centuries.length })`)
  
    centuries.forEach(century => {
  
      const centuryItem = $(`<option value=${century.name}>${century.name}</option>`)
  
      $('#select-century').append(centuryItem);
  
    })
  }
  catch (err) {
    console.error("Oh no! You've encountered an error pre-fetching classification and century dropdowns! Error: ", err);
  }

}


//Constructs the necessary url to filter displayed objects by classication, century, and/or keywords specified
function buildSearchString () {
const classification = $('#select-classification').val();
const century = $('#select-century').val();
const keywords = $('#keywords').val();

const url = `${ BASE_URL }/object?${ KEY }&classification=${ classification }&century=${ century }${century !== 'any' ? ' century' : ''}&keyword=${ keywords }`;

return encodeURI(url);
}


//Displays loading screen
function onFetchStart() {
  $('#loading').addClass('active');
}


//Hides loading screen
function onFetchEnd() {
  $('#loading').removeClass('active');
}


//Helper function to construct the preview element which will be populated in the aside following a search
function renderPreview (record) {
  const {title, description, primaryimageurl} = record;

  //only inerts <img> tag into template if img is available for the current record so that broken image icon does not appear
  const previewImage = primaryimageurl
  ? `<img src='${primaryimageurl}'/>`
  : '';

  const previewElem = $(`
  <div class='object-preview'>
    <a href='#'>
      ${previewImage}
      <h3>${title ? title : ''}</h3>
    </a>
    <h3>${description ? description : ''}</h3>
  </div>
  `)
  previewElem.data('record', record);
  return previewElem;
}


//Renders previews of objects (filtered by search if applicable) in aside; updates "previous" and "next" buttons in aside as appropriate based on number of pages of results
function updatePreview(records, info) {

  const root = $('#preview');

  $('.results').empty();

  for (let record of records) {
    $('.results').append(renderPreview(record)); 
  }

  if (info.next) {
    $('.next').data('url', info.next);
    $('.next').attr('disabled', false);
  } else {
    $('.next').data('url', null);
    $('.next').attr('disabled', true);
  }

  if (info.prev) {
    $('.previous').data('url', info.prev);
    $('.previous').attr('disabled', false);
  } else {
    $('.previous').data('url', null);
    $('.previous').attr('disabled', true); 
  }
}


//Builds URL to further search API for tags mentioned in results of currently displayed item
function searchURL (searchType, searchString) {
  return `${ BASE_URL }/object?${ KEY }&${ searchType}=${ searchString }`;
}


// Builds elements for content to be displayed in preview of selected object
function factHTML (title, content, searchTerm = null) {

  if (!content) {return ''}

  else if (!searchTerm) {

    const newElem = `
    <span>${title}</span>
    <span>${content}</span>
    `

    return newElem;
  } else {

    const newElem = `
    <span>${title}</span>
    <a href='${searchURL(searchTerm, content)}'>
      <span>${content}</span>
    </a>
    `

    return newElem;
  }

}


//Builds  elements for images to be displayed in preview of selected object
function photosHTML (images, primaryimageurl) {
  if (!images){return ''}
  else if (images.length > 0) {
    const newImg = images.map(image => {return `<img src='${image.baseimageurl}'/>`}).join('');
    return newImg;
  } else if (primaryimageurl) {
    return $(`<img src='${primaryimageurl}'/>`)
  } else {
    return '';
  }

}


//Builds element for and renders selected object
function renderFeature (record) {

  const {title, dated, description, culture, style, technique, medium, dimensions, people, department, division, contact, creditline, images, primaryimageurl} = record;
  
  const featTemplate = $(`
  <div class="object-feature">
  <header>
    <h3>${title}</h3>
    <h4>${dated}</h4>
  </header>
  <section class="facts">
    ${ factHTML("Description", description) }
    ${ factHTML("Culture", culture, "culture") }
    ${ factHTML("Style", style) }
    ${ factHTML("Technique", technique, "technique") }
    ${ factHTML("Medium", medium, "medium") }
    ${ factHTML("Dimensions", dimensions) }
    ${
      people
      ? people.map(person => factHTML("Person", person.displayname, "person")).join('')
      : ''
    }
    ${ factHTML("Department", department) }
    ${ factHTML("Division", division) }
    ${ factHTML("Contact", `<a target="_blank" href="mailto:${ contact }">${ contact }</a>`) }
    ${ factHTML("Creditline", creditline) }
  </section>
  <section class="photos">
    ${ photosHTML(images, primaryimageurl) }
  </section>
</div>
  `)

  return featTemplate;
}


/*------------------------------------------------------------------------------Click Handlers------------------------------------------------------------------------------*/


//Enables the "search" button's functionality
$('#search').on('submit', async function (event) {
  event.preventDefault();
  onFetchStart();

  try {
    const searchUrl = buildSearchString();
    const response = await fetch(searchUrl);
    const {info, records} = await response.json();
    updatePreview(records, info);
  }
  catch (err) {
    console.error("Oh no! You've encountered an error submitting a search query! Error: ", err)
  }
  finally {
    onFetchEnd();
  }
});


//Enables "preview" and "next" buttons' functionality
$('#preview .next, #preview .previous').on('click', async function () {
  
  onFetchStart();
  try {
    const newUrl = $(this).data('url');
    const response = await fetch(newUrl);
    const {info, records} = await response.json();
    updatePreview(records, info);
  }
  catch (err)
  {
    console.error("Oh no! You've encountered an error using the next/previous click handler! Error: ", err)
  }
  finally{
    onFetchEnd();
  }
});


//Renders object when selected from aside preview
$('#preview').on('click', '.object-preview', function (event) {

  event.preventDefault();
  const obj = $(this).closest('.object-preview').data('record');
  $('#feature').html(renderFeature(obj));

});


//Enables new search for other objects in the collection tagged with a term clicked on in the dislay result of an object
$('#feature').on('click', 'a', async function (event){
  const searchUrl = encodeURI($(this).attr('href'));
  if (searchUrl.startsWith('mailto')) {return;}
  event.preventDefault();
  onFetchStart();

  try {
    const response = await fetch(searchUrl);
    const {info, records} = await response.json();
    updatePreview(records, info);
  }
  catch (err) {
    console.error("Oh no! You've encountered an error searching an anchor tag! Error: ", err)
  }
  finally {
    onFetchEnd();
  }

})


fetchObjects();
prefetchCategoryLists();
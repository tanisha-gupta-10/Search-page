import React, { useEffect, useReducer, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axios from "axios";

const TempSearch = () => {
  const [query, setQuery] = useState("");
  const searching = useRef(false);
  const noResults = useRef(false);
  const inputRef = useRef(null);
  const oldQuery = useRef("");
  const [searchParams] = useSearchParams();
  const modal = document.getElementById("micModal");
  const [data, setData] = useState({
    classes: [],
    courses: [],
    ebooks: [],
    pdfs: [],
  });
  const [suggested, setSuggested] = useState([]);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const userId = searchParams.get("userId") || 1;
  const displayHelp = useRef(true);

  let { interimTranscript, finalTranscript, listening } =
    useSpeechRecognition();

  function clickHandler() {
    try {
      window.Android.openMic();
    } catch {
      //
    }
    if (!listening) {
      SpeechRecognition.startListening({
        continuous: false,
        language: "en-GB",
      });
      modal.style.display = "block";
    } else {
      closeRecognition();
    }
  }

  useEffect(() => {
    if (!listening && modal && !searching.current) {
      modal.style.display = "none";
    } else {
      //
    }
  }, [listening]);

  function closeRecognition() {
    modal.style.display = "none";
    SpeechRecognition.stopListening();
  }

  function loadSuggested() {
    axios({
      method: "GET",
      url:
        "https://prod.vidyakul.com/api/v1/search-recommendations?user_id=" +
        userId,
    })
      .then((res) => {
        setSuggested(res.data.data);
      })
      .catch((err) => console.log("Recommendations Error: ", err));
  }

  useEffect(() => {
    async function trackPageLoad() {
      await axios({
        method: "POST",
        url: "https://prod.vidyakul.com/api/v1/events/record-proxy",
        headers: {
          Accept: "text/plain",
          "Content-Type": "application/json",
        },
        data: [
          {
            event: "SEARCH_PAGE_OPEN",
            properties: {
              time: Date.now(),
              distinct_id: userId,
            },
          },
        ],
      });
    }
    loadSuggested();
    trackPageLoad();
    placeholderAnimation();
    // try {
    //   window.Android.openKeyboard();
    // } catch (error) {
    //   console.log("Android Open Keyboard is not working");
    // }
    inputRef.current && inputRef.current.focus();
  }, []);

  async function fetchData(manualQuery = "", viaMic = false) {
    displayHelp.current = false;
    const searchQuery = manualQuery || query;
    if (searchQuery !== "") {
      if (oldQuery.current !== searchQuery) {
        oldQuery.current = searchQuery;
        let resultCount;
        await axios({
          method: "GET",
          url:
            "https://prod.vidyakul.com/api/v1/new-search-classes?search=" +
            searchQuery +
            "&user_id=" +
            userId,
          headers: {
            Accept: "text/plain",
          },
        }).then((res) => {
          if (
            res.data.hits.classes.length === 0 &&
            res.data.hits.courses.length === 0 &&
            res.data.hits.ebooks.length === 0 &&
            res.data.hits.pdfs.length === 0
          ) {
            resultCount = 0;
            noResults.current = true;
            forceUpdate();
          } else {
            setData(res.data.hits);
          }
        });
        trackSearch(searchQuery, viaMic, resultCount);
      }
    } else {
      setData({
        classes: [],
        courses: [],
        ebooks: [],
        pdfs: [],
        live_courses: [],
      });
    }
  }

  async function searchHandler() {
    searching.current = true;
    await fetchData();
    searching.current = false;
  }

  useEffect(() => {
    setData({
      classes: [],
      courses: [],
      ebooks: [],
      pdfs: [],
      live_courses: [],
    });
    noResults.current = false;
  }, [query]);

  useEffect(() => {
    async function mainFunc() {
      if (interimTranscript !== "") {
        setQuery(interimTranscript);
      }
      if (finalTranscript !== "") {
        searching.current = true;
        setQuery(finalTranscript);
        await fetchData(finalTranscript, true);
        searching.current = false;
        modal.style.display = "none";
        interimTranscript = "";
      }
    }
    mainFunc();
  }, [interimTranscript, finalTranscript]);

  function goBack() {
    try {
      window.Android.performCloseClick();
    } catch {
      //
    }
  }

  async function openClass(
    slug,
    classId = "",
    classTitle = "",
    type = "search-result",
  ) {
    try {
      await trackClassOpen(classId, classTitle, type);
      window.Android.openClass(slug);
    } catch {
      //
    }
  }

  async function openRecordedCourse(slug, resultTitle) {
    try {
      await trackResultOpen(slug, resultTitle, "recorded-course");
      window.Android.openRecordedCourse(slug);
    } catch {
      //
    }
  }

  async function openLiveCourse(slug, resultTitle) {
    try {
      await trackResultOpen(slug, resultTitle, "live-course");
      window.Android.openLiveCourse(slug);
    } catch {
      //
    }
  }

  async function openEbook(slug, resultTitle) {
    try {
      await trackResultOpen(slug, resultTitle, "ebook");
      window.Android.openEbook(slug);
    } catch {
      //
    }
  }

  //eslint-disable-next-line no-unused-vars
  async function pdfOpen(slug, resultTitle) {
    try {
      await trackResultOpen(slug, resultTitle, "class-pdf");
      window.Android.openPdf(slug, resultTitle);
    } catch {
      //
    }
  }

  async function trackSearch(searchQuery, isMicSearch, resultCount) {
    await axios({
      method: "POST",
      url: "https://prod.vidyakul.com/api/v1/events/record-proxy",
      headers: {
        Accept: "text/plain",
        "Content-Type": "application/json",
      },
      data: [
        {
          event: "CLASS_SEARCH",
          properties: {
            time: Date.now(),
            distinct_id: userId,
            "Search Query": searchQuery,
            "Searched Via Mic": isMicSearch,
            "Returned Results Count": resultCount,
          },
        },
      ],
    });
  }

  async function trackResultOpen(identification, resultTitle, type = "") {
    await axios({
      method: "POST",
      url: "https://prod.vidyakul.com/api/v1/events/record-proxy",
      headers: {
        Accept: "text/plain",
        "Content-Type": "application/json",
      },
      data: [
        {
          event: "SEARCH_RESULT_OPEN",
          properties: {
            time: Date.now(),
            distinct_id: userId,
            "Search Query": query,
            "Result Identifier": identification,
            "Result Title": resultTitle,
            "Search Type": type,
          },
        },
      ],
    });
  }

  async function trackClassOpen(classId, classTitle, type) {
    await axios({
      method: "POST",
      url: "https://prod.vidyakul.com/api/v1/events/record-proxy",
      headers: {
        Accept: "text/plain",
        "Content-Type": "application/json",
      },
      data: [
        {
          event: "CLASS_OPEN",
          properties: {
            time: Date.now(),
            distinct_id: userId,
            "Search Query": query,
            "Class ID": classId,
            "Class Title": classTitle,
            "Class Type": type,
            Version: "2",
          },
        },
      ],
    });
  }

  // Add something to given element placeholder
  function addToPlaceholder(toAdd, el) {
    el.setAttribute("placeholder", el.getAttribute("placeholder") + toAdd);
    // el.attr("placeholder", el.attr("placeholder") + toAdd);
    // Delay between symbols "typing"
    return new Promise((resolve) => setTimeout(resolve, 100));
  }
  // Clear placeholder attribute in given element
  function clearPlaceholder(el) {
    el.setAttribute("placeholder", "");
  }
  // Print one phrase
  function printPhrase(phrase, el) {
    return new Promise((resolve) => {
      // Clear placeholder before typing next phrase
      clearPlaceholder(el);
      let letters = phrase.split("");
      // For each letter in phrase
      letters.reduce(
        (promise, letter, index) =>
          promise.then((_) => {
            // Resolve promise when all letters are typed
            if (index === letters.length - 1) {
              // Delay before start next phrase "typing"
              setTimeout(resolve, 1000);
            }
            return addToPlaceholder(letter, el);
          }),
        Promise.resolve(),
      );
    });
  }
  // Print given phrases to element
  function printPhrases(phrases, el) {
    phrases.reduce(
      (promise, phrase) => promise.then((_) => printPhrase(phrase, el)),
      Promise.resolve(),
    );
  }

  function placeholderAnimation() {
    let phrases = ["यहाँ Search करें", "Search Here"];
    printPhrases(phrases, document.getElementById("class-search-input"));
    setTimeout(() => {
      placeholderAnimation();
    }, 17 * 1000);
  }

  return (
    <div className="mx-auto search-page">
      <div className="container">
        <div
          className="row height d-flex justify-content-center align-items-center"
          style={{
            overflowY: "visible",
          }}
        >
          <div className="col-lg-6 px-0">
            <div className="class-search-form text-break">
              <div className="class-search-input-container pb-0 relative mb-5">
                {/* <img
                  alt="decoration-book"
                  className="absolute w-7/12 translate-middle top-[22%] left-[58%]"
                  src="https://d2n7zouke881gi.cloudfront.net/uploads/new/new%20icons/flyingbook.svg"
                /> */}
                <img
                  alt="decoration-openbook"
                  className="absolute w-7/12 translate-middle top-[70%] left-1/2"
                  src="https://d2n7zouke881gi.cloudfront.net/uploads/new/new%20icons/openbook.svg"
                />
                <span className="left-pan" onClick={goBack}>
                  <i className="bi bi-arrow-left text-white"></i>
                </span>
                <p className="pt-[45px] px-4 mb-0 text-white text-2xl font-semibold">
                  <span className="">आप आज क्या पढ़ना</span> <br />
                  <span>चाहेंगे?</span>
                </p>
                <div className="input-container-box m-3 mt-0 translate-y-6 px-2 py-0 bg-white rounded-xl shadow-sm border-2 border-[#F3F5FC] h-[50px]">
                  <div className="d-flex w-full my-auto mt-1">
                    <input
                      autoFocus
                      type="search"
                      className="form-control form-input px-2 pe-3"
                      placeholder=""
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyUp={(event) => {
                        if (event.code === "Enter" || event.which === 13) {
                          searchHandler();
                        }
                      }}
                      id="class-search-input"
                      value={query}
                      ref={inputRef}
                    />
                    {SpeechRecognition.browserSupportsSpeechRecognition() ? (
                      <div
                        className="search-input-mic relative"
                        onClick={clickHandler}
                      >
                        <img
                          alt="mic-icon"
                          src="https://d2n7zouke881gi.cloudfront.net/uploads/new/new%20icons/mic-purple.svg"
                          className="absolute translate-middle top-1/2 left-[60%] w-[25px]"
                        />
                      </div>
                    ) : (
                      ""
                    )}
                    <div
                      className="search-icon-input relative"
                      onClick={searchHandler}
                    >
                      <img
                        alt="search-icon"
                        src="https://d2n7zouke881gi.cloudfront.net/uploads/new/new%20icons/search.svg"
                        className="absolute translate-middle top-1/2 left-[40%] w-[22px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              {data.classes.length !== 0 ||
              (data.courses && data.courses.length !== 0) ||
              (data.ebooks && data.ebooks.length !== 0) ||
              (data.pdfs && data.pdfs.length !== 0) ? (
                <div className="col-lg-6 mb-3 px-2 search-suggestions relative">
                  <div className="search-results mt-4 px-2 pt-3">
                    <h5 className="text-lg font-bold mb-2">Search Results:</h5>
                    {/* CLASSES DISPLAY */}
                    {data.classes.length !== 0 ? (
                      <div>
                        <h5 className="text-lg font-bold mb-2">Classes:</h5>
                        {data.classes.map((item) => {
                          return (
                            <div
                              key={item.class_id}
                              onClick={() => {
                                openClass(
                                  item.class_slug,
                                  item.class_id,
                                  item.original_name,
                                );
                              }}
                              className="card m-0 result-item border-0 mt-2"
                            >
                              <div className="row g-0 px-0 ">
                                <div className="col-4 pe-2">
                                  <div className="img-fluid img-overlay px-2">
                                    <img
                                      src={
                                        item.dummy_thumbnail ||
                                        "https://dkuddpry619qg.cloudfront.net/singleliveclass/new-single-liveclass/48344/time_2023-04-27%2014:39:43.png"
                                      }
                                      className="img-fluid rounded-2 my-auto aspect-[3/2] object-cover"
                                      alt="Class Thumbnail"
                                      onError={({ currentTarget }) => {
                                        currentTarget.onerror = null; // prevents looping
                                        currentTarget.src =
                                          "https://dkuddpry619qg.cloudfront.net/singleliveclass/new-single-liveclass/48344/time_2023-04-27%2014:39:43.png";
                                      }}
                                    />
                                    {item.dummy_thumbnail && (
                                      <span className="project-overlay">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="26"
                                          height="26"
                                          fill="#543AE3"
                                          className="bi bi-play-circle-fill bg-white rounded-circle"
                                          viewBox="0 0 16 16"
                                        >
                                          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814l-3.5-2.5z" />
                                        </svg>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="card-body px-0 col-7 result-card-body py-0">
                                  <p className="card-title search-title text-wrap font-semibold pr-3 mb-0 h-4/6 pt-1 text-[16px] leading-relaxed">
                                    {item.original_name}
                                  </p>
                                  <p className="card-text mt-0 row h-2/6">
                                    <span
                                      className={`fw-medium col-6 text-left text-[${item.subject_color}]`}
                                    >
                                      <span className="text-sm">
                                        {item.subject}
                                      </span>
                                    </span>
                                    <span className="fw-medium col-6 text-right">
                                      <span className="text-sm">
                                        {item.teacher}
                                      </span>
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      ""
                    )}
                    {/* LIVE COURSES FOR FREE USERS  */}
                    {data.live_courses.length !== 0 ? (
                      <div className="mt-2">
                        <h5 className="text-lg font-bold mb-2">
                          Live Courses:
                        </h5>
                        <div className="my-2 pb-3 grid auto-cols-[18rem] grid-flow-col gap-4 overflow-x-auto search-results-noscroll">
                          {data.live_courses.map((item) => {
                            return (
                              <>
                                <div
                                  key={item.slug}
                                  onClick={() => {
                                    openLiveCourse(item.slug, item.name);
                                  }}
                                  className="group col-span-1 cursor-pointer border-2 shadow-md rounded-xl"
                                >
                                  <div className="flex w-full flex-col">
                                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded">
                                      <img
                                        src={
                                          item.featured_image_url ||
                                          "https://d2n7zouke881gi.cloudfront.net/randomUploads/webUsage/CourseThumbnail.png"
                                        }
                                        alt="Course Thumbnail"
                                        className="h-full w-full object-cover transition group-hover:scale-110"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                    {/* COURSES DISPLAY */}
                    {data.courses.length !== 0 ? (
                      <div className="mt-2">
                        <h5 className="text-lg font-bold mb-2">Courses:</h5>
                        <div className="my-2 pb-3 grid auto-cols-[14rem] grid-flow-col gap-4 overflow-x-auto search-results-noscroll">
                          {data.courses.map((item) => {
                            return (
                              <>
                                <div
                                  key={item.slug}
                                  onClick={() => {
                                    openRecordedCourse(
                                      item.slug,
                                      item.original_name,
                                    );
                                  }}
                                  className="group col-span-1 cursor-pointer border-2 shadow-md rounded-xl"
                                >
                                  <div className="flex w-full flex-col">
                                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t">
                                      <img
                                        src={
                                          item.ebook_thumbnail ||
                                          item.dummy_thumbnail ||
                                          "https://d2n7zouke881gi.cloudfront.net/randomUploads/webUsage/CourseThumbnail.png"
                                        }
                                        alt="Course Thumbnail"
                                        className="h-full w-full object-cover transition group-hover:scale-110"
                                      />
                                    </div>
                                    <div className="m-0 mt-2 py-0 px-2 h-[5.2rem]">
                                      <div className="h-3/5">
                                        <p className="search-title font-semibold text-[16px] leading-relaxed">
                                          {item.original_name}
                                        </p>
                                      </div>
                                      <p className="card-text mt-0 h-2/5 my-1 pt-1">
                                        <span className="flex justify-between">
                                          <span
                                            className={`fw-medium text-sm text-left text-[${item.subject_color}]`}
                                          >
                                            {item.subject}
                                          </span>
                                          <span className="fw-medium text-sm text-right ms-auto me-0">
                                            {item.teacher}
                                          </span>
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                    {/* Ebooks */}
                    {data.ebooks.length !== 0 ? (
                      <div className="mt-2  h-[15rem]">
                        <h5 className="text-lg font-bold mb-2">E-Books:</h5>
                        <div className="my-2 pb-3 grid auto-cols-[11rem] grid-flow-col gap-4 overflow-x-auto h-fit search-results-noscroll">
                          {data.ebooks.map((item) => {
                            return (
                              <>
                                <div
                                  key={`ebook-${item.slug}`}
                                  onClick={() => {
                                    openEbook(item.slug, item.original_name);
                                  }}
                                  className="group col-span-1 cursor-pointer border-2 shadow-md rounded-xl"
                                >
                                  <div className="flex w-full flex-col">
                                    <div className="img-fluid img-overlay bg-[#ccc4f7] mt-0">
                                      <img
                                        src={
                                          item.ebook_thumbnail ||
                                          "https://d2n7zouke881gi.cloudfront.net/randomUploads/webUsage/CourseThumbnail.png"
                                        }
                                        alt="Ebook Thumbnail"
                                        className="aspect-[10/14] max-h-[8rem] mx-auto object-cover transition group-hover:scale-110"
                                      />
                                    </div>
                                    <div className="m-0 mt-2 py-0 px-2 h-[5.2rem]">
                                      <div className="h-3/5">
                                        <p className="search-title font-semibold text-[16px] leading-relaxed">
                                          {item.original_name}
                                        </p>
                                      </div>
                                      <p className="card-text mt-0 row h-2/5 pt-1">
                                        <span
                                          className={`fw-medium col-12 text-left font-semibold text-[${item.subject_color}]`}
                                        >
                                          <span className="text-sm">
                                            {item.subject}
                                          </span>
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                    {/* Class PDFs */}
                    {/* {data.pdfs.length !== 0 ? <div className="mt-2">
                      <h5 className="text-lg font-bold mb-2">Class PDFs:</h5>
                        <div className="my-2 pb-3 grid auto-cols-[15rem] grid-flow-col gap-4 overflow-x-auto">
                          {data.pdfs.map((item) => {
                            return (
                              <>
                                <div 
                                  key={`ebook-${item.slug}`}
                                  onClick={() => {
                                    pdfOpen(
                                      item.slug, item.original_name
                                    );
                                  }} 
                                  className="group col-span-1 cursor-pointer border-2 shadow-md rounded-xl"
                                >
                                  <div className="flex w-full flex-col">
                                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded">
                                      <img 
                                        src={
                                          item.ebook_thumbnail || "https://d2n7zouke881gi.cloudfront.net/randomUploads/webUsage/CourseThumbnail.png"
                                        }
                                        alt = "PDF Thumbnail"
                                        className="h-full w-full object-cover transition group-hover:scale-110" 
                                      />
                                    </div>
                                    <div className="m-0 mt-2 py-0 px-2 h-[6.5rem]">
                                      <div className="h-4/6">
                                        <p className="search-title font-semibold text-[16px] leading-relaxed">
                                          {item.original_name}
                                        </p>
                                      </div>
                                      <p className="card-text mt-0 row h-2/6">
                                        <span
                                          className={`fw-medium col-6 text-left text-[${item.subject_color}]`}
                                        >
                                        <span className="text-sm">
                                          {item.subject}
                                        </span>
                                        </span>
                                        <span className="fw-medium col-6 text-right">
                                        <span className="text-sm">
                                          {item.teacher}
                                        </span>
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })}
                        </div>
                      </div>
                     : ("")} */}
                  </div>
                </div>
              ) : noResults.current ? (
                <div className="row text-center px-3">
                  <div className="col-4 mx-auto mt-3 px-0">
                    <img
                      src="https://vidyakul-public.s3.ap-south-1.amazonaws.com/uploads/new/questionsimg/Search.svg "
                      className="img-fluid rounded-2 my-auto"
                      alt="..."
                    />
                  </div>
                  <h6 className="text-center mt-0">No results found</h6>
                  <div className="mt-3 px-0">
                    <div
                      className="text-center font-medium text-base px-0"
                      style={{ fontWeight: 200 }}
                    >
                      <p className="mb-0">क्या आपको कोई समस्या हो रही है?</p>
                      <p className="mb-0 mt-1">
                        आप हमें नीचे दिए गए नंबर पर कॉल कर सकते हैं
                      </p>
                      <p className="mt-1 p-0">
                        <a
                          className="mt-0"
                          onClick={() => {
                            try {
                              window.Android.contactUs("9818434684");
                            } catch {
                              //
                            }
                          }}
                        >
                          9818434684
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              ) : query ? (
                <div className="row mt-1">
                  <small className="text-center" style={{ fontWeight: 100 }}>
                    Click icon to search
                  </small>
                </div>
              ) : (
                ""
              )}
              {displayHelp.current && (
                <div
                  className={`text-center text-base font-medium ${
                    query ? "mt-3" : "mt-[4rem]"
                  }`}
                >
                  <p className="mb-0 text-[#543AE3] mt-1">
                    आप यहां Recorded Class, PDF या Course खोज सकते हैं
                  </p>
                  <p className="mt-1">
                    You can Search for Classes, PDFs or Courses here
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="col-12"></div>
          {data.classes.length === 0 &&
          data.courses.length === 0 &&
          data.ebooks.length === 0 &&
          data.pdfs.length === 0 &&
          suggested.length ? (
            <div className="col-lg-6 mb-0 px-2 search-suggestions mx-3 relative overflow-x-hidden mt-3">
              <div className="search-results px-2">
                <h5 className="mt-3 text-lg font-bold mb-2">
                  Recommendations:
                </h5>
                {suggested.map((item) => {
                  return (
                    <>
                      <div
                        key={item._id}
                        onClick={() => {
                          openClass(
                            item.class_slug,
                            item.class_id,
                            item.original_name,
                            "recommended",
                          );
                        }}
                        className="card my-[6px] result-item border-0 mt-2"
                      >
                        <div className="row g-0 px-0 ">
                          <div className="col-4 pe-2">
                            <div className="img-fluid img-overlay px-2">
                              <img
                                src={
                                  item.dummy_thumbnail ||
                                  "https://dkuddpry619qg.cloudfront.net/singleliveclass/new-single-liveclass/48344/time_2023-04-27%2014:39:43.png"
                                }
                                className="img-fluid rounded-2 my-auto aspect-[3/2] object-cover"
                                alt="Class Thumbnail"
                                onError={({ currentTarget }) => {
                                  currentTarget.onerror = null; // prevents looping
                                  currentTarget.src =
                                    "https://dkuddpry619qg.cloudfront.net/singleliveclass/new-single-liveclass/48344/time_2023-04-27%2014:39:43.png";
                                }}
                              />
                              {item.dummy_thumbnail && (
                                <span className="project-overlay">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="26"
                                    height="26"
                                    fill="#543AE3"
                                    className="bi bi-play-circle-fill bg-white rounded-circle"
                                    viewBox="0 0 16 16"
                                  >
                                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814l-3.5-2.5z" />
                                  </svg>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="card-body px-0 col-7 result-card-body py-0">
                            <p className="card-title search-title text-wrap font-semibold pr-3 mb-0 h-4/6 pt-1 text-[16px] leading-relaxed">
                              {item.original_name}
                            </p>
                            <p className="card-text mt-0 row h-2/6">
                              <span
                                className={`fw-medium col-6 text-left text-[${item.subject_color}]`}
                              >
                                <span className="text-sm">{item.subject}</span>
                              </span>
                              <span className="fw-medium col-6 text-right">
                                <span className="text-sm">{item.teacher}</span>
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* <div className="w-[120vw] h-[2px] bg-[#F3F5FC] ml-[-20px]"></div> */}
                    </>
                  );
                })}
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
      </div>

      {/* The Modal */}
      <div id="micModal" className="modal">
        {/* Modal content */}
        <div className="modal-content">
          <span
            onClick={() => {
              closeRecognition();
              modal.style.display = "none";
            }}
            className="close"
          >
            &times;
          </span>
          <div className="mt-5 mic-translation">
            {interimTranscript || finalTranscript}
          </div>
          <div className="mic-top text-center">
            <p className="text-muted">Try Saying Nouns...</p>
          </div>
          <div className="mic-container">
            <div className="grey-shadow delay1"></div>
            <div className="grey-shadow delay2"></div>
            <div className="grey-shadow delay3"></div>
            <div className="grey-shadow delay4"></div>
            <div onClick={clickHandler} className="mic-pod">
              <div className="mic">
                <img
                  alt="mic-logo"
                  className="img-fluid mx-auto my-auto"
                  src="https://vidyakul-public.s3.ap-south-1.amazonaws.com/uploads/mic-icon.png"
                ></img>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modal End */}
    </div>
  );
};

export default TempSearch;
